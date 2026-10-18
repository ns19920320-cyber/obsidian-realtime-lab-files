import {transientTransferFailure} from './retry-policy.mjs';
// Tracks references only. Text remains in the existing durable CRDT snapshot;
// file bytes remain in the existing durable chunk cache.
export function changedPaths(doc,transaction){
 const paths=new Set();
 for(const [name,type] of doc.share){
  if(!transaction.changed.has(type))continue;
  if(name.startsWith('text:'))paths.add(name.slice(5));
  else if(name==='files'||name==='deleted'){for(const key of transaction.changed.get(type))if(typeof key==='string')paths.add(key);}
  else if(name==='blobVersions')for(const key of transaction.changed.get(type)){const v=type.get(key);if(v?.path)paths.add(v.path);}
 }
 return [...paths];
}
/** @param {{metadata?:string[],files?:{path:string,size:number}[],dirty?:string[],failures?:[string,string][],downloads?:string[]}} input */
export function queueRows({metadata=[],files=[],dirty=[],failures=[],downloads=[]}){
 const rows=new Map();
 for(const path of metadata)rows.set(path,{path,state:'等待服务器确认'});
 for(const p of files)rows.set(p.path,{path:p.path,state:'文件待传',bytes:p.size});
 for(const path of dirty)rows.set(path,{path,state:'等待上传'});
 for(const path of downloads)rows.set(path,{path,state:'接收处理中'});
 for(const [path,error] of failures)rows.set(path,{path,state:transientTransferFailure(error)?'网络中断，等待自动重试':'失败，可重试',error});
 return [...rows.values()];
}

// Counts unique file paths, not requests or chunks. No content or durable state changes.
/** @param {{known?:string[],pending?:string[],failures?:string[],active?:number,ready?:boolean}} input */
export function fileProgress({known=[],pending=[],failures=[],active=0,ready=false}){
 const paths=new Set(known),waiting=new Set(pending.filter(p=>p!=='*'));
 for(const p of waiting)paths.add(p);
 const retry=new Set(failures.filter(p=>p!=='*'));
 for(const p of retry){paths.add(p);waiting.add(p);}
 const total=paths.size,remaining=waiting.size;
 return {available:ready&&!pending.includes('*'),total,completed:Math.max(0,total-remaining),remaining,retry:retry.size,active};
}
