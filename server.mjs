import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import worker from './dist/server/index.js';
import {FileBucket} from './bucket.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
try{process.loadEnvFile(path.join(root,'.env'));}catch(error){if(error.code!=='ENOENT')throw error;}
const local=process.env.NODE_ENV!=='production';
let password=process.env.ADMIN_PASSWORD;
if(!password){if(!local)throw Error('ADMIN_PASSWORD must be set for production.');const passwordFile=path.join(root,'admin-password.txt');try{password=(await fs.readFile(passwordFile,'utf8')).trim();}catch(error){if(error.code!=='ENOENT')throw error;password=randomBytes(18).toString('base64url');await fs.writeFile(passwordFile,password+'\n',{mode:0o600});}console.log('Yönetim şifresi: admin-password.txt dosyasında.');}
if(password.length<12)throw Error('ADMIN_PASSWORD must contain at least 12 characters.');
const bucket=new FileBucket(process.env.DATA_DIR||path.join(root,'storage'),path.join(root,'initial-data'));
await bucket.ready;
const sessions=new Map(),attempts=new Map();
const hash=value=>createHash('sha256').update(value).digest();
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function loginPage(message=''){return new Response(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yönetici girişi — Word in Motion</title><link rel="stylesheet" href="/style.css"><main class="admin-main"><section class="admin-panel"><h1>Yönetici girişi</h1><p>${escape(message)}</p><form method="post" action="/login"><label>Yönetim şifresi<input name="password" type="password" autocomplete="current-password" required maxlength="256"></label><p><button class="primary">Giriş yap</button></p></form><a href="/">← Siteye dön</a></section></main></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}});}
const server=http.createServer(async(req,res)=>{
 try{
  const base=process.env.PUBLIC_ORIGIN||'http://'+req.headers.host;
  const url=new URL(req.url,base);
  const cookie=/(?:^|;\s*)wim_session=([^;]+)/.exec(req.headers.cookie||'')?.[1];
  const expiry=cookie?sessions.get(cookie):null;
  const authorized=!!expiry&&expiry>Date.now();
  if(cookie&&expiry&&!authorized)sessions.delete(cookie);
  let response;
  if(url.pathname==='/login'&&req.method==='GET')response=loginPage();
  else if(url.pathname==='/login'&&req.method==='POST'){
   if(req.headers.origin!==url.origin){response=new Response('Geçersiz istek',{status:403});}
   else{
    const ip=req.socket.remoteAddress,previous=attempts.get(ip),record=previous&&previous.until>Date.now()?previous:{count:0,until:Date.now()+15*60*1000};
    attempts.set(ip,record);
    if(record.count>=5)response=new Response('Çok sayıda başarısız giriş. 15 dakika sonra yeniden deneyiniz.',{status:429});
    else{
     let body='';for await(const chunk of req){body+=chunk;if(body.length>2048)throw Error('Login body too large');}
     const entered=new URLSearchParams(body).get('password')||'';
     if(!timingSafeEqual(hash(entered),hash(password))){record.count++;response=loginPage('Şifre yanlış.');}
     else{attempts.delete(ip);const token=randomBytes(32).toString('hex');sessions.set(token,Date.now()+8*60*60*1000);response=new Response(null,{status:303,headers:{Location:'/admin','Set-Cookie':`wim_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${url.protocol==='https:'?'; Secure':''}`}});}
    }
   }
  }else if(url.pathname==='/logout'&&req.method==='POST'){
   if(req.headers.origin!==url.origin)response=new Response('Geçersiz istek',{status:403});
   else{if(cookie)sessions.delete(cookie);response=new Response(null,{status:303,headers:{Location:'/','Set-Cookie':'wim_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'}});}
  }else if(['/admin','/admin.html','/signin-with-chatgpt'].includes(url.pathname)&&!authorized)response=Response.redirect(url.origin+'/login',302);
  else{
   const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value!==undefined&&!key.toLowerCase().startsWith('oai-authenticated-'))headers.set(key,Array.isArray(value)?value.join(','):value);
   if(authorized){headers.set('oai-authenticated-user-email','owner@local.invalid');headers.set('oai-authenticated-user-id','local-owner');}
   const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
   response=await worker.fetch(request,{BUCKET:bucket,ADMIN_EMAIL:'owner@local.invalid'});
  }
  res.writeHead(response.status,Object.fromEntries(response.headers));
  if(response.body&&req.method!=='HEAD')await pipeline(Readable.fromWeb(response.body),res);else res.end();
 }catch(error){console.error(error.message);if(!res.headersSent)res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});res.end('İşlem tamamlanamadı.');}
});
server.requestTimeout=180000;
server.listen(Number(process.env.PORT||3000),process.env.HOST||(local?'127.0.0.1':'0.0.0.0'),()=>console.log('Word in Motion hazır: '+(process.env.PUBLIC_ORIGIN||'http://localhost:'+Number(process.env.PORT||3000))));
