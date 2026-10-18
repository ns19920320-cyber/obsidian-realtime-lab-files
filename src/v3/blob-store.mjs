import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CHUNK_BYTES} from './sha256.mjs';
import {MAX_BLOB_BYTES,MAX_DISK_BYTES,MAX_DISK_OBJECTS} from './limits.mjs';
export {MAX_BLOB_BYTES};
export const MAX_STORE_BYTES=MAX_DISK_BYTES;
const HASH=/^[a-f0-9]{64}$/;
const syncDir=p=>{const fd=fs.openSync(p,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};
// Private, content-addressed sidecar. No attachment bytes enter CRDT or JSON.
export class BlobStore{
 constructor(dir,{maxBytes=MAX_STORE_BYTES,maxFiles=MAX_DISK_OBJECTS}={}){this.dir=dir;this.maxBytes=maxBytes;this.maxFiles=maxFiles;this.busy=false;fs.mkdirSync(dir,{recursive:true,mode:0o700});if(fs.lstatSync(dir).isSymbolicLink())throw Error('Blob directory cannot be a symlink');}
 file(hash,suffix=''){if(!HASH.test(hash))throw Error('Invalid blob hash');return path.join(this.dir,hash+suffix);}
 stat(p){try{const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink())throw Error('Invalid blob file');return s;}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 status(hash,size){this.checkSize(size);const complete=this.stat(this.file(hash));if(complete){if(complete.size!==size)throw Error('Blob size mismatch');return {complete:true,offset:size,size};}const meta=this.stat(this.file(hash,'.meta'));if(meta){if(JSON.parse(fs.readFileSync(this.file(hash,'.meta'),'utf8')).size!==size)throw Error('Partial size mismatch');}const part=this.stat(this.file(hash,'.part'));if(part&&!meta)throw Error('Incomplete upload metadata');if(part&&part.size>size)throw Error('Invalid partial length');return {complete:false,offset:part?.size||0,size};}
 checkSize(size){if(!Number.isSafeInteger(size)||size<0||size>MAX_BLOB_BYTES)throw Error('Blob exceeds streamed 16 MiB limit or invalid size');}
 has(hash,size){return this.status(hash,size).complete;}
 reserve(hash,size){let bytes=0,files=0;for(const f of fs.readdirSync(this.dir)){if(HASH.test(f)){bytes+=this.stat(path.join(this.dir,f)).size;files++;}else if(/^[a-f0-9]{64}\.meta$/.test(f)){bytes+=JSON.parse(fs.readFileSync(path.join(this.dir,f),'utf8')).size;files++;}}if(files>=this.maxFiles||bytes+size>this.maxBytes)throw Error('Blob storage quota reached; retained history is included');const meta=this.file(hash,'.meta'),fd=fs.openSync(meta,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify({size}));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}syncDir(this.dir);}
 async append(hash,size,offset,bytes){if(this.busy)throw Error('Blob writer busy');this.busy=true;try{const s=this.status(hash,size);if(s.complete)return s;if(!Number.isSafeInteger(offset)||offset!==s.offset||bytes.length!==Math.min(CHUNK_BYTES,size-offset))throw Error('Chunk offset or length mismatch');if(!this.stat(this.file(hash,'.meta')))this.reserve(hash,size);const part=this.file(hash,'.part'),fd=fs.openSync(part,fs.constants.O_CREAT|fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW,0o600);try{fs.writeSync(fd,bytes,0,bytes.length,offset);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(offset+bytes.length===size){const h=createHash('sha256');for await(const chunk of fs.createReadStream(part,{highWaterMark:CHUNK_BYTES}))h.update(chunk);if(h.digest('hex')!==hash){fs.unlinkSync(part);fs.unlinkSync(this.file(hash,'.meta'));syncDir(this.dir);throw Error('Blob hash mismatch');}fs.renameSync(part,this.file(hash));fs.unlinkSync(this.file(hash,'.meta'));syncDir(this.dir);return {complete:true,offset:size,size};}return {complete:false,offset:offset+bytes.length,size};}finally{this.busy=false;}}
 read(hash,offset){const p=this.file(hash),s=this.stat(p);if(!s)throw Error('Blob missing');if(!Number.isSafeInteger(offset)||offset<0||offset>s.size)throw Error('Invalid read offset');const b=Buffer.alloc(Math.min(CHUNK_BYTES,s.size-offset)),fd=fs.openSync(p,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{if(fs.readSync(fd,b,0,b.length,offset)!==b.length)throw Error('Short blob read');}finally{fs.closeSync(fd);}return b;}
}
