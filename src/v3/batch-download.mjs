import {CHUNK_BYTES,hashSource} from './sha256.mjs';
export const SMALL_BATCH_CAPABILITY='small-blob-batch-v1';
export const BATCH_COUNT=16,BATCH_BYTES=256*1024;
export function batchRefs(refs){
 if(!Array.isArray(refs)||!refs.length||refs.length>BATCH_COUNT)throw Error('Invalid batch count');
 let size=0;const seen=new Set();for(const r of refs){if(!r||!/^[a-f0-9]{64}$/.test(r.hash)||!Number.isSafeInteger(r.size)||r.size<0||r.size>CHUNK_BYTES||seen.has(r.hash))throw Error('Invalid batch reference');seen.add(r.hash);size+=r.size;}
 if(size>BATCH_BYTES)throw Error('Batch exceeds byte limit');return size;
}
export async function verifyBatch(refs,bytes,signal){
 if(bytes.length!==batchRefs(refs))throw Error('Batch response length mismatch');const result=new Map();let offset=0;
 // Validate the entire response before any caller writes a cache or vault file.
 for(const ref of refs){signal?.throwIfAborted();const data=bytes.subarray(offset,offset+ref.size);offset+=ref.size;if(await hashSource({size:data.length,read:async(p,n)=>data.subarray(p,p+n)},signal)!==ref.hash)throw Error('Batch hash mismatch');result.set(ref.hash,data);}return result;
}
// One current response plus one request ahead: <=512 KiB payload retained.
// Metadata only is queued. Errors are settled immediately; close drains native HTTP.
export class SmallBlobPipeline{
 /** @param {any[]} refs @param {Function} fetchBatch @param {{canRun?:()=>boolean}} options */
 constructor(refs,fetchBatch,{canRun=()=>true}={}){this.fetchBatch=fetchBatch;this.canRun=canRun;this.groups=[];this.indexByHash=new Map();this.index=-1;this.closed=false;const seen=new Set();let group=[],size=0;for(const r of refs){if(r.size>CHUNK_BYTES||seen.has(r.hash))continue;seen.add(r.hash);if(group.length&&(group.length>=BATCH_COUNT||size+r.size>BATCH_BYTES)){this.groups.push(group);group=[];size=0;}this.indexByHash.set(r.hash,this.groups.length);group.push(r);size+=r.size;}if(group.length)this.groups.push(group);}
 start(index){if(this.closed||!this.canRun()||index>=this.groups.length)return;this.nextIndex=index;this.next=Promise.resolve().then(()=>this.fetchBatch(this.groups[index])).then(value=>({value}),error=>({error}));}
 async idle(){if(this.next)await this.next;}
 async take(ref){if(this.closed||!this.canRun())return null;const index=this.indexByHash.get(ref.hash);if(index===undefined||index<this.index)return null;
  if(index!==this.index){if(this.next&&this.nextIndex!==index){await this.next;this.next=null;}if(!this.next)this.start(index);if(!this.next)return null;this.current=await this.next;this.next=null;this.index=index;this.start(index+1);}
  if(this.current.error)throw this.current.error;return this.current.value.get(ref.hash)||null;
 }
 async close(){this.closed=true;await this.idle();this.next=null;this.current=null;}
}
