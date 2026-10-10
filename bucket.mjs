import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
export class FileBucket {
 constructor(directory,seedDirectory){this.directory=path.resolve(directory);this.seedDirectory=path.resolve(seedDirectory);this.queue=Promise.resolve();this.ready=this.initialize();}
 async initialize(){await fs.mkdir(path.join(this.directory,'objects'),{recursive:true});try{this.objects=JSON.parse(await fs.readFile(path.join(this.directory,'objects.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;this.objects=JSON.parse(await fs.readFile(path.join(this.seedDirectory,'objects.json'),'utf8'));await this.save();}}
 async save(){const temp=path.join(this.directory,'objects.json.tmp');await fs.writeFile(temp,JSON.stringify(this.objects,null,2));await fs.rename(temp,path.join(this.directory,'objects.json'));}
 async locked(task){await this.ready;const result=this.queue.then(task);this.queue=result.catch(()=>{});return result;}
 full(record){const root=record.seed?this.seedDirectory:this.directory;const file=path.resolve(root,record.file);if(!file.startsWith(root+path.sep))throw Error('Invalid storage path');return file;}
 async head(key){await this.ready;const record=this.objects[key];return record?{...record,key,httpEtag:'"'+record.etag+'"'}:null;}
 async list({prefix='',limit=100}={}){await this.ready;return {objects:Object.entries(this.objects).filter(([key])=>key.startsWith(prefix)).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit).map(([key,value])=>({...value,key})),truncated:false};}
 async get(key,options={}){const record=await this.head(key);if(!record)return null;if(options.onlyIf?.etagMatches&&options.onlyIf.etagMatches!==record.etag)return null;const range=options.range;return {...record,body:Readable.toWeb(createReadStream(this.full(record),range?{start:range.offset,end:range.offset+range.length-1}:{}))};}
 async put(key,body,options={}){return this.locked(async()=>{const current=this.objects[key];if(options.onlyIf?.etagMatches&&current?.etag!==options.onlyIf.etagMatches)return null;if(options.onlyIf?.etagDoesNotMatch==='*'&&current)return null;const file='objects/'+randomUUID();const full=path.join(this.directory,file);if(body?.getReader)await pipeline(Readable.fromWeb(body),createWriteStream(full));else await fs.writeFile(full,typeof body==='string'?body:Buffer.from(body));const hash=createHash('sha256');const stream=createReadStream(full);for await(const chunk of stream)hash.update(chunk);const stat=await fs.stat(full);const record={file,seed:false,size:stat.size,etag:hash.digest('hex'),httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}};this.objects[key]=record;await this.save();return {...record,key,httpEtag:'"'+record.etag+'"'};});}
 async delete(keys){return this.locked(async()=>{for(const key of Array.isArray(keys)?keys:[keys])delete this.objects[key];await this.save();});}
}
