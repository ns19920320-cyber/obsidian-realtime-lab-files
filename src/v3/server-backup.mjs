// Private server-store snapshots. No authentication token or client configuration
// is copied. Metadata is atomically replaced by the server; committed blobs are
// immutable and currently never garbage-collected, so one captured metadata file
// plus its exact references forms a consistent point-in-time snapshot.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import * as Y from 'yjs';
import {decode} from '../client.mjs';
import {validate} from './model.mjs';
import {FILE_REFS_CAPABILITY,MAX_DISK_BYTES,MAX_DISK_OBJECTS,MAX_BLOB_BYTES} from './limits.mjs';
export const RESTORE_MARKER='.realtime-lab-restore-incomplete';
const FORMAT='realtime-lab-server-backup-v1',META='vault-v3-files.json',MANIFEST='backup-manifest.json';
const hash=b=>createHash('sha256').update(b).digest('hex');
const within=(a,b)=>a===b||a.startsWith(b+path.sep);
async function regular(file,max=Infinity){const s=await fs.lstat(file);if(!s.isFile()||s.isSymbolicLink()||s.size>max)throw Error('Invalid backup file: '+path.basename(file));return s;}
async function directory(input,create=false){const full=path.resolve(input),parts=full.split(path.sep).filter(Boolean);let p=path.parse(full).root;for(const part of parts){p=path.join(p,part);if(create)await fs.mkdir(p,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});const s=await fs.lstat(p);if(!s.isDirectory()||s.isSymbolicLink())throw Error('Backup paths must be real directories, not symlinks');}return fs.realpath(full);}
async function syncDir(dir){const h=await fs.open(dir,'r');try{await h.sync();}finally{await h.close();}}
async function bytes(file,max){await regular(file,max);const h=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);try{return await h.readFile();}finally{await h.close();}}
async function digest(file){const h=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);try{const s=await h.stat();if(!s.isFile())throw Error('Not a regular backup file');const sha=createHash('sha256');let n=0;for await(const b of h.createReadStream({autoClose:false})){sha.update(b);n+=b.length;}return {bytes:n,sha256:sha.digest('hex')};}finally{await h.close();}}
async function write(file,data){const h=await fs.open(file,'wx',0o600);try{await h.writeFile(data);await h.sync();}finally{await h.close();}}
async function copy(file,target,expected){await regular(file,expected.bytes);const a=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);let b;try{b=await fs.open(target,'wx',0o600);const sha=createHash('sha256');let n=0;for await(const part of a.createReadStream({autoClose:false})){sha.update(part);n+=part.length;await b.writeFile(part);}await b.sync();if(n!==expected.bytes||sha.digest('hex')!==expected.sha256)throw Error('Backup content hash mismatch');}finally{await a.close();await b?.close();}}
function references(metadata){
 const allowed=['protocol','capability','serverId','state','history','seq','reviews','pathReceipts'];
 if(!metadata||Object.keys(metadata).some(k=>!allowed.includes(k))||metadata.protocol!==3||metadata.capability!==FILE_REFS_CAPABILITY||!/^[a-f0-9-]{36}$/.test(metadata.serverId)||!Number.isSafeInteger(metadata.seq)||metadata.seq<0)throw Error('Invalid Files server metadata');
 const refs=new Map(),add=r=>{if(!/^[a-f0-9]{64}$/.test(r.hash)||!Number.isSafeInteger(r.size)||r.size<0||r.size>MAX_BLOB_BYTES)throw Error('Invalid backup blob reference');if(refs.has(r.hash)&&refs.get(r.hash)!==r.size)throw Error('Conflicting blob size');refs.set(r.hash,r.size);};
 const doc=new Y.Doc();try{Y.applyUpdate(doc,decode(metadata.state));validate(doc);for(const v of doc.getMap('blobVersions').values())add(v);for(const v of doc.getMap('files').values())if(v.kind!=='text'&&v.hash)add(v);}finally{doc.destroy();}
 if(!metadata.history||typeof metadata.history!=='object'||Array.isArray(metadata.history))throw Error('Invalid backup history');
 for(const list of Object.values(metadata.history)){if(!Array.isArray(list))throw Error('Invalid history list');for(const v of list)if(!v.deleted&&v.kind!=='text')add(v);}
 if(refs.size>MAX_DISK_OBJECTS||[...refs.values()].reduce((a,b)=>a+b,0)>MAX_DISK_BYTES)throw Error('Backup references exceed server limits');return refs;
}
function entryPath(p){return p===META||/^blobs\/[a-f0-9]{64}$/.test(p);}
export async function verifyServerBackup(input){
 const root=await directory(input),manifest=JSON.parse(await bytes(path.join(root,MANIFEST),4*1024*1024));
 if(manifest.format!==FORMAT||!Array.isArray(manifest.files)||manifest.files.length>MAX_DISK_OBJECTS+1||!Number.isFinite(Date.parse(manifest.createdAt)))throw Error('Invalid backup manifest');
 const expected=new Map();let total=0;
 for(const f of manifest.files){if(!entryPath(f.path)||expected.has(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('Invalid manifest entry');if(f.bytes>(f.path===META?128*1024*1024:MAX_BLOB_BYTES))throw Error('Backup file exceeds limit');expected.set(f.path,f);total+=f.bytes;}
 if(total>MAX_DISK_BYTES+128*1024*1024||!expected.has(META)||total!==manifest.totalBytes)throw Error('Invalid backup totals');
 const top=(await fs.readdir(root)).sort();if(JSON.stringify(top)!==JSON.stringify([MANIFEST,META,'blobs'].sort()))throw Error('Unexpected backup content');
 await directory(path.join(root,'blobs'));const blobNames=await fs.readdir(path.join(root,'blobs'));if(blobNames.length!==expected.size-1||blobNames.some(n=>!expected.has('blobs/'+n)))throw Error('Missing or unexpected backup blobs');
 for(const f of expected.values()){const got=await digest(path.join(root,f.path));if(got.bytes!==f.bytes||got.sha256!==f.sha256)throw Error('Backup SHA256 mismatch');}
 const metadata=JSON.parse(await bytes(path.join(root,META),128*1024*1024)),refs=references(metadata);
 if(metadata.serverId!==manifest.serverId||metadata.seq!==manifest.seq||refs.size!==blobNames.length)throw Error('Backup metadata identity or references mismatch');
 for(const [sha,size] of refs){const f=expected.get('blobs/'+sha);if(!f||f.bytes!==size||f.sha256!==sha)throw Error('Backup referenced blob mismatch');}
 return manifest;
}
export async function createServerBackup(source,backupRoot,{now=Date.now,minFreeBytes=64*1024*1024,maxBackupBytes=16*1024*1024*1024}={}){
 if(!Number.isFinite(maxBackupBytes)||maxBackupBytes<1||!Number.isFinite(minFreeBytes)||minFreeBytes<0)throw Error('Invalid backup quota');
 const src=await directory(source);try{await fs.lstat(path.join(src,RESTORE_MARKER));throw Error('Source restore is incomplete');}catch(e){if(e.code!=='ENOENT')throw e;}if(within(path.resolve(backupRoot),src)||within(src,path.resolve(backupRoot)))throw Error('Backup/source paths overlap');const parent=await directory(backupRoot,true);
 if(within(src,parent)||within(parent,src))throw Error('Backup/source paths overlap');
 // Read the atomic metadata file ONCE. Concurrent later commits do not change it.
 const raw=await bytes(path.join(src,META),128*1024*1024),metadata=JSON.parse(raw),refs=references(metadata);
 await directory(path.join(src,'blobs'));
 const files=[{path:META,bytes:raw.length,sha256:hash(raw)},...[...refs].sort().map(([sha,size])=>({path:'blobs/'+sha,bytes:size,sha256:sha}))],totalBytes=files.reduce((a,b)=>a+b.bytes,0);
 let used=0;for(const item of await fs.readdir(parent,{withFileTypes:true})){if(item.isSymbolicLink())throw Error('Symlink in backup root');if(item.isDirectory()){for(const f of await walkFiles(path.join(parent,item.name)))used+=(await regular(f)).size;}}
 if(totalBytes+used>maxBackupBytes)throw Error('Backup quota exceeded; existing backups retained');
 const disk=await fs.statfs(parent);if(Number(disk.bavail)*Number(disk.bsize)<totalBytes+minFreeBytes)throw Error('Insufficient free disk; existing backups retained');
 const name='backup-'+now()+'-'+randomUUID(),stage=path.join(parent,'.partial-'+name),final=path.join(parent,name);await fs.mkdir(stage,{mode:0o700});await fs.mkdir(path.join(stage,'blobs'),{mode:0o700});
 const manifest={format:FORMAT,serverId:metadata.serverId,seq:metadata.seq,createdAt:new Date(now()).toISOString(),files,totalBytes};
 await write(path.join(stage,META),raw);
 for(const f of files.slice(1))await copy(path.join(src,f.path),path.join(stage,f.path),f);
 await write(path.join(stage,MANIFEST),JSON.stringify(manifest,null,2));await syncDir(path.join(stage,'blobs'));await syncDir(stage);await verifyServerBackup(stage);await fs.rename(stage,final);await syncDir(parent);return {directory:final,...manifest};
}
async function walkFiles(root){const out=[];for(const e of await fs.readdir(root,{withFileTypes:true})){const p=path.join(root,e.name);if(e.isSymbolicLink())throw Error('Symlink refused in backup storage');if(e.isDirectory())out.push(...await walkFiles(p));else if(e.isFile())out.push(p);else throw Error('Special backup file refused');}return out;}
export async function restoreServerBackup(backup,destination){
 const src=await directory(backup),manifest=await verifyServerBackup(src);if(within(path.resolve(destination),src)||within(src,path.resolve(destination)))throw Error('Restore/backup paths overlap');const parent=await directory(path.dirname(path.resolve(destination)),true),dest=path.join(parent,path.basename(destination));
 if(within(dest,src)||within(src,dest))throw Error('Restore/backup paths overlap');
 await fs.mkdir(dest,{mode:0o700}); // Exclusive creation: existing directories are never overwritten.
 await write(path.join(dest,RESTORE_MARKER),'Restore incomplete: do not start the server.');await fs.mkdir(path.join(dest,'blobs'),{mode:0o700});
 // Metadata is written LAST, so a partial restore cannot look like a ready store.
 for(const f of manifest.files.filter(f=>f.path!==META))await copy(path.join(src,f.path),path.join(dest,f.path),f);
 await syncDir(path.join(dest,'blobs'));const meta=manifest.files.find(f=>f.path===META);await copy(path.join(src,META),path.join(dest,META+'.partial'),meta);await fs.rename(path.join(dest,META+'.partial'),path.join(dest,META));await syncDir(dest);await fs.unlink(path.join(dest,RESTORE_MARKER));await syncDir(dest);await syncDir(parent);
 return {destination:dest,serverId:manifest.serverId,seq:manifest.seq,totalBytes:manifest.totalBytes,credentialsIncluded:false};
}
// Never prune an unknown directory, failed/partial snapshot, foreign server, or
// the newest backup. No pruning occurs until a NEW backup verifies successfully.
export async function pruneServerBackups(root,serverId,{keep=14,maxAgeMs=30*86400000,now=Date.now}={}){
 if(!Number.isInteger(keep)||keep<1||keep>10000||!Number.isFinite(maxAgeMs)||maxAgeMs<0)throw Error('Invalid retention policy');
 const dir=await directory(root),rows=[];for(const name of await fs.readdir(dir)){if(!/^backup-\d+-[a-f0-9-]{36}$/.test(name))continue;try{const m=await verifyServerBackup(path.join(dir,name));if(m.serverId===serverId)rows.push({name,time:Date.parse(m.createdAt)});}catch{}}
 rows.sort((a,b)=>b.time-a.time||b.name.localeCompare(a.name));const removed=[];
 for(let i=1;i<rows.length;i++)if(i>=keep||now()-rows[i].time>maxAgeMs){await fs.rm(path.join(dir,rows[i].name),{recursive:true});removed.push(rows[i].name);}await syncDir(dir);return removed;
}
export function scheduleServerBackups({source,backupRoot,intervalMs=86400000,retryMs=60000,retention={keep:14,maxAgeMs:30*86400000},create=createServerBackup,prune=pruneServerBackups,onStatus=()=>{}}){
 if(!Number.isFinite(intervalMs)||intervalMs<10||!Number.isFinite(retryMs)||retryMs<10)throw Error('Invalid backup interval');
 let timer,busy=false,closed=false,inFlight,status={state:'waiting',lastSuccess:null,lastError:null};
 const run=()=>{if(closed||busy)return inFlight;busy=true;inFlight=(async()=>{try{const snapshot=await create(source,backupRoot);status={state:'ok',lastSuccess:new Date().toISOString(),lastError:null,backup:snapshot.directory,removed:0};try{const removed=await prune(backupRoot,snapshot.serverId,retention);status.removed=removed.length;}catch(e){status.retentionError=String(e.message||e);}}catch(e){status={...status,state:'error',lastError:String(e.message||e)};}finally{try{await onStatus({...status});}catch{}busy=false;if(!closed){timer=setTimeout(run,status.state==='ok'?intervalMs:retryMs);timer.unref?.();}}return {...status};})();return inFlight;};
 timer=setTimeout(run,0);timer.unref?.();return {run,get status(){return {...status,busy};},async close(){closed=true;clearTimeout(timer);await inFlight;}};
}
