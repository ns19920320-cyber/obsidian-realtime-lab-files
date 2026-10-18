import {supported,content,put,remove} from './model.mjs';
import {sameContent} from './conflicts.mjs';
export const PATH_SAFETY_CAPABILITY='protected-paths-v1';
export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function validatePathOperation(op){
 if(!op||!UUID.test(op.id)||!['delete','rename'].includes(op.kind)||Object.keys(op).some(k=>!['id','kind','entries'].includes(k))||!Array.isArray(op.entries)||!op.entries.length||op.entries.length>3000||new TextEncoder().encode(JSON.stringify(op)).length>2*1024*1024)throw Error('Invalid protected path operation');
 const sources=new Set(),targets=new Set();for(const e of op.entries){if(!e||!supported(e.from)||sources.has(e.from)||Object.keys(e).some(k=>!['from','to','base','target'].includes(k))||!e.base||!['text','image','file'].includes(e.base.kind))throw Error('Invalid protected source');sources.add(e.from);if(op.kind==='rename'){if(!supported(e.to)||e.to.toLowerCase()===e.from.toLowerCase()||targets.has(e.to.toLowerCase()))throw Error('Invalid or case-only rename target');targets.add(e.to.toLowerCase());}else if(e.to!==undefined)throw Error('Delete cannot have target');}
 return op;
}
export function applyPathOperation(doc,op){validatePathOperation(op);for(const e of op.entries){const current=content(doc,e.from);if(!current||!sameContent(current,e.base)||(current.kind!=='text'&&current.version!==e.base.version))throw Error('Source changed; protected operation requires review');if(op.kind==='rename'&&content(doc,e.to))throw Error('Rename target exists; both paths retained');}for(const e of op.entries){if(op.kind==='rename')put(doc,e.to,e.target||content(doc,e.from),'protected-rename');remove(doc,e.from,'protected-path');}}
export function bulkDeletion(count,total){return count>=5||(count>=3&&count/Math.max(1,total)>=0.25);}
export function operationPaths(op){return op.entries.flatMap(e=>e.to?[e.from,e.to]:[e.from]);}
export function validateSafetyQueue(queue,serverId){if(!queue)return;if(queue.serverId!==serverId||!Array.isArray(queue.items)||queue.items.length>128||queue.items.reduce((n,x)=>n+x.op.entries.length,0)>3000||new TextEncoder().encode(JSON.stringify(queue)).length>2*1024*1024)throw Error('Protected queue identity or capacity mismatch');for(const item of queue.items){validatePathOperation(item.op);if(typeof item.approved!=='boolean'||typeof item.backedUp!=='boolean')throw Error('Invalid protected queue item');}}
