export async function appearance(request,env,isAdmin){
 const url=new URL(request.url),p=url.pathname;
 if(p!=='/api/design'&&p!=='/api/logo'&&p!=='/api/covers'&&!p.startsWith('/api/covers/')&&p!=='/api/slides'&&!p.startsWith('/api/slides/'))return null;
 const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 const key=p==='/api/design'?'design/settings':p==='/api/logo'?'design/logo':p.startsWith('/api/covers/')?'covers/'+p.slice(12):p.startsWith('/api/slides/')?'slides/'+p.slice(12):null;
 if(p.startsWith('/api/covers/')&&!/^(FAF-(0[1-9]|1\d|2[0-2])|DE-(0[1-9]|1\d|2[0-3]))$/.test(p.slice(12)))return json({error:'Geçersiz kelime.'},400);
 if(p.startsWith('/api/slides/')&&!/^[1-3]$/.test(p.slice(12)))return json({error:'Geçersiz slider alanı.'},400);
 if(request.method==='GET'){
  if(p==='/api/covers'){const list=await env.BUCKET.list({prefix:'covers/',limit:100});return json(list.objects.map(o=>({id:o.key.slice(7),etag:o.etag})));}
  if(p==='/api/slides'){const list=await env.BUCKET.list({prefix:'slides/',limit:10});return json(list.objects.map(o=>({slot:Number(o.key.slice(7)),etag:o.etag})).filter(x=>x.slot>=1&&x.slot<=3));}
  const obj=await env.BUCKET.get(key);if(!obj)return p==='/api/design'?json({}):new Response(null,{status:404});
  if(p==='/api/design'){const settings=JSON.parse(await new Response(obj.body).text());for(const k of ['sideLine1Tr','sideLine1En'])if(typeof settings[k]==='string')settings[k]=settings[k].replace(/(?:\b10\.?\s*s[ıiİI]n[ıiİI]f\b|\bgrade\s*10\b)\s*(?:[·—–-]\s*)?/gi,'').trim();return json(settings);}
  return new Response(obj.body,{headers:{'Content-Type':p==='/api/design'?'application/json':obj.httpMetadata.contentType,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(!isAdmin||request.headers.get('Origin')!==url.origin)return json({error:'Yalnızca site sahibi değiştirebilir.'},403);
 if(!key)return json({error:'İşlem desteklenmiyor.'},405);
 if(request.method==='DELETE'&&(p.startsWith('/api/covers/')||p.startsWith('/api/slides/')||p==='/api/logo')){await env.BUCKET.delete(key);return json({ok:true});}
 if(request.method!=='PUT')return json({error:'İşlem desteklenmiyor.'},405);
 if(p==='/api/design'){
  if(Number(request.headers.get('Content-Length'))>4096)return json({error:'Ayarlar çok büyük.'},413);
  const s=await request.json();const fonts=['Arial, Helvetica, sans-serif',"'Trebuchet MS', sans-serif",'Verdana, sans-serif','Georgia, serif'];
  const contentKeys=['brandTitle','brandSubtitleTr','brandSubtitleEn','sloganKickerTr','sloganKickerEn','sloganMainTr','sloganMainEn','sloganAccentTr','sloganAccentEn','sideLine1Tr','sideLine1En','sideLine2Tr','sideLine2En'];
  if(!['accent','background','text'].every(k=>/^#[a-f0-9]{6}$/i.test(s[k]))||!fonts.includes(s.font)||![3,4].includes(s.columns)||!Number.isInteger(s.radius)||s.radius<0||s.radius>24||contentKeys.some(k=>typeof s[k]!=='string'||!s[k].trim()||s[k].length>80))return json({error:'Geçersiz tasarım veya metin ayarı.'},400);
  const saved={accent:s.accent,background:s.background,text:s.text,font:s.font,columns:s.columns,radius:s.radius};for(const k of contentKeys)saved[k]=s[k].trim();
  await env.BUCKET.put(key,JSON.stringify(saved),{httpMetadata:{contentType:'application/json'}});return json({ok:true});
 }
 const type=request.headers.get('Content-Type'),size=Number(request.headers.get('Content-Length')),isSlide=p.startsWith('/api/slides/'),maxSize=isSlide?10*1024*1024:5*1024*1024,allowed=isSlide?['image/png','image/jpeg','image/webp','image/gif']:['image/png','image/jpeg','image/webp'];
 if(!allowed.includes(type)||!size||size>maxSize)return json({error:isSlide?'En fazla 10 MB PNG, JPG, WebP veya GIF seçin.':'En fazla 5 MB PNG, JPG veya WebP seçin.'},400);
 const bytes=new Uint8Array(await request.arrayBuffer());const valid=type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/gif'?String.fromCharCode(...bytes.slice(0,4))==='GIF8':String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!valid||bytes.length>maxSize)return json({error:'Geçersiz görsel.'},400);
 await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:type}});return json({ok:true});
}
