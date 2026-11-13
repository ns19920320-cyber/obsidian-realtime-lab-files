import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {reviewId} from './protected-review.mjs';
const exec=promisify(execFile);
// The remote command is a fixed read below a configured backup root. Neither
// a device nor a receipt can supply a command, host, archive name or extra path.
export function nasReviewReceiptReader(root,{run=exec}={}){
 if(typeof root!=='string'||!/^\/[A-Za-z0-9/_-]+$/.test(root)||root.includes('..')||root.endsWith('/'))throw Error('Invalid NAS review root');
 return async({manifest,digest})=>{if(![manifest.serverId,manifest.deviceId,manifest.jobId].every(reviewId))throw Error('Invalid NAS review identity');const dir=[root,manifest.serverId,manifest.deviceId,manifest.jobId].join('/'),options={timeout:15000,maxBuffer:8192,encoding:'utf8'};
  let raw;try{raw=(await run('ssh',['-o','BatchMode=yes','-o','ConnectTimeout=3','nas','cat -- '+dir+'/receipt.json'],options)).stdout;}catch{return null;}
  const r=JSON.parse(raw);if(r.manifestHash!==digest||!(/^[a-f0-9]{64}$/).test(r.archiveSha256))throw Error('Invalid NAS receipt');const sum=(await run('ssh',['-o','BatchMode=yes','-o','ConnectTimeout=3','nas','sha256sum -- '+dir+'/archive.tar.gz'],options)).stdout.trim().split(/\s+/)[0];if(sum!==r.archiveSha256)throw Error('NAS archive checksum mismatch');return r;
 };
}
