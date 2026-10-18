import {Sha256} from './sha256.mjs';
import {supportedFile as supported,maxFileSize} from './file-policy.mjs';
export const byteDigest=bytes=>new Sha256().update(bytes).hex();
export const referenceDigest=item=>item?.kind==='text'?byteDigest(new TextEncoder().encode(item.data)):item?.hash;
export function connectionIdentity({vaultName,basePath,url,serverId,deviceId,deviceName}){
 let endpoint='未配置';try{const u=new URL(url);if(['ws:','wss:'].includes(u.protocol)){u.username='';u.password='';u.search='';u.hash='';endpoint=u.toString();}}catch{}
 return {vaultName,localPath:basePath||'系统未提供完整路径，请在 Obsidian 仓库管理中核对',endpoint,serverId:serverId||'尚未核实',deviceId:deviceId||'尚未分配',deviceName:deviceName||'未命名设备'};
}
// Read bytes directly, never through the fingerprint/cache writer. No vault, cache,
// document, settings or queue mutation is permitted during an audit.
export async function auditFiles({files,remote,read,queued=/** @type {string[]} */([]),maxPaths=8192}){
 const local=new Map(files.map(f=>[f.path,f])),paths=[...new Set([...local.keys(),...Object.keys(remote)])].sort();
 if(paths.length>maxPaths)throw Error('Audit path capacity exceeded');
 const pending=new Set(queued),rows=[];
 for(const path of paths){const f=local.get(path),r=remote[path];let row={path,status:'equal',localHash:null,remoteHash:r?referenceDigest(r):null};
  if(!supported(path)||(f&&f.size>maxFileSize(path))){row.status='excluded';rows.push(row);continue;}
  try{if(f){const bytes=new Uint8Array(await read(path));if(bytes.length>maxFileSize(path))throw Error('File grew beyond limit');row.localHash=byteDigest(bytes);row.status=r?(row.localHash===row.remoteHash?'equal':'different'):'local-only';}else row.status='missing';}catch{row.status='read-error';}
  if(pending.has('*')||pending.has(path))row.status='queued';rows.push(row);
 }
 const counts={equal:0,missing:0,different:0,'local-only':0,queued:0,excluded:0,'read-error':0};for(const r of rows)counts[r.status]++;
 return {counts,rows,automaticWrites:0};
}
export function assertRepairSnapshot(row,{localHash,remoteHash,queued=false,stable=true}){
 if(!stable||!['missing','different'].includes(row.status)||queued||localHash!==row.localHash||remoteHash!==row.remoteHash)throw Error('文件或同步状态已变化，请重新核验；未替换文件');
}
