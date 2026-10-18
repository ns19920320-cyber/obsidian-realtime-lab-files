import fs from 'node:fs';
import {BlobStore} from './blob-store.mjs';
import {CHUNK_BYTES,hashSource} from './sha256.mjs';
// Node test/desktop adapter. Mobile requires its own durable Blob cache adapter;
// this module is deliberately never imported into the mobile plugin bundle.
export class DiskBlobCache{
 constructor(dir,options){this.store=new BlobStore(dir,options);}
 async stage(source,{signal}={}){const hash=await hashSource(source,signal),ref={hash,size:source.size};let s=this.store.status(hash,source.size);while(!s.complete){signal?.throwIfAborted();const bytes=await source.read(s.offset,Math.min(CHUNK_BYTES,source.size-s.offset));s=await this.store.append(hash,source.size,s.offset,bytes);}return ref;}
 source(ref){if(!this.store.has(ref.hash,ref.size))throw Error('Local blob incomplete');return {size:ref.size,read:async(p,n)=>{const b=this.store.read(ref.hash,p);return new Uint8Array(b.buffer,b.byteOffset,Math.min(b.length,n));}};}
 sink(ref){return {length:async()=>this.store.status(ref.hash,ref.size).offset,write:async(p,b)=>{await this.store.append(ref.hash,ref.size,p,b);},read:async(p,n)=>{const b=this.store.read(ref.hash,p);return new Uint8Array(b.buffer,b.byteOffset,Math.min(b.length,n));},commit:async()=>{if(ref.size===0&&!this.store.has(ref.hash,0))await this.store.append(ref.hash,0,0,new Uint8Array());if(!this.store.has(ref.hash,ref.size))throw Error('Incomplete cached download');}};}
}
export function fileSource(file){const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW),s=fs.fstatSync(fd);if(!s.isFile()){fs.closeSync(fd);throw Error('Regular source file required');}let closed=false;return {size:s.size,async read(p,n){if(closed)throw Error('Source closed');const b=new Uint8Array(n);if(fs.readSync(fd,b,0,n,p)!==n)throw Error('Source changed');return b;},close(){if(!closed){closed=true;fs.closeSync(fd);}}};}
