import {supportedFile,maxFileSize} from './file-policy.mjs';
import {byteDigest,referenceDigest} from './consistency.mjs';
import {content} from './model.mjs';
import {deletionGeneration} from './deletion-generation.mjs';
export const PROTECTED_REVIEW_CAPABILITY='protected-review-nas-v1';
export const reviewId=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x);
export function reviewManifest(v){
 if(!v||Object.keys(v).sort().join(',')!=='deviceId,files,jobId,protocol,serverId'||v.protocol!==1||![v.serverId,v.deviceId,v.jobId].every(reviewId)||!Array.isArray(v.files)||!v.files.length||v.files.length>6000)throw Error('Invalid protected review manifest');
 let total=0;const paths=new Set(),files=v.files.map(f=>{if(!f||Object.keys(f).sort().join(',')!=='hash,path,size'||!supportedFile(f.path)||!Number.isSafeInteger(f.size)||f.size<0||f.size>maxFileSize(f.path)||!(/^[a-f0-9]{64}$/).test(f.hash)||paths.has(f.path.toLowerCase()))throw Error('Invalid protected review file');paths.add(f.path.toLowerCase());total+=f.size;return {path:f.path,hash:f.hash,size:f.size};}).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(new TextEncoder().encode(JSON.stringify(files)).length>2*1024*1024)throw Error('Protected review manifest exceeds 2 MiB');if(total>1024*1024*1024)throw Error('Protected review snapshot exceeds 1 GiB');return {protocol:1,serverId:v.serverId,deviceId:v.deviceId,jobId:v.jobId,files};
}
export const reviewDigest=m=>byteDigest(new TextEncoder().encode(JSON.stringify(reviewManifest(m))));
export function historicalDuplicate(file,doc,history){
 if(content(doc,file.path))return null;const generation=deletionGeneration(doc,file.path);if(!generation)return null;
 const match=(history[file.path]||[]).find(v=>!v.deleted&&referenceDigest(v)===file.hash&&(v.kind==='text'?new TextEncoder().encode(v.data).length:v.size)===file.size);
 return match?{...file,generation,historyId:match.id}:null;
}
export async function collectProtectedReview({paths,identity,read,blocked=(_path)=>false,shouldContinue=()=>true}){
 const files=[];for(const path of [...new Set(paths)].sort()){if(!shouldContinue())throw Error('Protected review interrupted; originals retained');if(blocked(path))throw Error('Protected path has pending edits; originals retained');const bytes=new Uint8Array(await read(path));if(blocked(path))throw Error('Protected path changed; originals retained');files.push({path,hash:byteDigest(bytes),size:bytes.length});}return reviewManifest({...identity,protocol:1,files});
}
export async function exportProtectedReview({manifest,request,upload,read,shouldContinue=()=>true}){
 manifest=reviewManifest(manifest);const prepared=await request('protected-review-prepare',{manifest});if(prepared.digest!==reviewDigest(manifest)||!Array.isArray(prepared.missing))throw Error('Protected review snapshot mismatch');const hashes=new Map(manifest.files.map(f=>[f.hash,f]));
 for(const hash of prepared.missing){if(!shouldContinue())throw Error('Protected review interrupted; originals retained');const file=hashes.get(hash);if(!file)throw Error('Unexpected protected review payload');const bytes=new Uint8Array(await read(file.path));if(byteDigest(bytes)!==hash||bytes.length!==file.size)throw Error('Protected file changed; originals retained');const ref=await upload({size:bytes.length,read:async(o,n)=>bytes.subarray(o,o+n)});if(ref.hash!==hash||ref.size!==bytes.length)throw Error('Protected review upload mismatch');}
 return request('protected-review-seal',{jobId:manifest.jobId,deviceId:manifest.deviceId});
}
// The caller supplies only the explicitly exported snapshot. A NAS receipt and
// a fresh per-path server/history/generation check are required before trashing.
export async function cleanProtectedReview({manifest,plan,read,blocked,check,trash,release}){
 manifest=reviewManifest(manifest);if(plan.digest!==reviewDigest(manifest)||!plan.nasVerified||!Array.isArray(plan.duplicates))throw Error('Verified NAS backup required');const files=new Map(manifest.files.map(f=>[f.path,f])),seen=new Set();
 for(const r of plan.duplicates){const f=files.get(r.path);if(!f||f.hash!==r.hash||f.size!==r.size||seen.has(r.path)||typeof r.generation!=='string'||typeof r.historyId!=='string')throw Error('Invalid cleanup snapshot');seen.add(r.path);}
 const removed=[],retained=[];for(const row of plan.duplicates){try{if(blocked(row.path))throw Error('Path has pending changes');let bytes=new Uint8Array(await read(row.path));if(byteDigest(bytes)!==row.hash||bytes.length!==row.size)throw Error('Local content changed');if(await check(row)!==true)throw Error('Remote review not confirmed');bytes=new Uint8Array(await read(row.path));if(blocked(row.path)||byteDigest(bytes)!==row.hash||bytes.length!==row.size)throw Error('Local content changed');await trash(row.path,row.hash);await release(row.path);removed.push(row.path);}catch{retained.push(row.path);}}
 return {removed,retained,unique:manifest.files.filter(f=>!seen.has(f.path)).map(f=>f.path)};
}
