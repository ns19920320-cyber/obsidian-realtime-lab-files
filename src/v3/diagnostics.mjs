import {validateDiagnosticDetails} from './diagnostic-details.mjs';
import {validateTransferCounters} from './transfer-counters.mjs';
import {validatePerformance} from './performance.mjs';
import {entries} from './model.mjs';
import {Sha256} from './sha256.mjs';
export const DIAGNOSTICS_CAPABILITY='device-diagnostics-v1';
export const DIAGNOSTICS_FRESH_MS=30000;
// Hash material content and deletions, not Yjs GC/undo implementation details.
export function documentDigest(doc){const active=entries(doc),deleted=new Set(doc.getMap('deleted').keys());for(const [path,m] of doc.getMap('files'))if(m.deleted)deleted.add(path);const state=['content-v1',Object.keys(active).sort().map(path=>[path,active[path]]),[...deleted].sort()];return new Sha256().update(new TextEncoder().encode(JSON.stringify(state))).hex();}
const counts=['queued','metadata','files','dirty','receiving','failed','conflicts'];
export function validateDiagnostic(input){
 const keys=['deviceId','platform','version','foreground','ready','busy','confirmedAgeMs','digest',...counts,'performance','transfers','details'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k)))throw Error('Invalid diagnostic fields');
 if(!/^[a-f0-9-]{36}$/.test(input.deviceId)||!['ios','android','macos','windows','linux','unknown'].includes(input.platform)||typeof input.version!=='string'||input.version.length>64||!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?$/.test(input.version))throw Error('Invalid diagnostic identity');
 if(['foreground','ready','busy'].some(k=>typeof input[k]!=='boolean')||counts.some(k=>!Number.isSafeInteger(input[k])||input[k]<0||input[k]>100000)||!(/^[a-f0-9]{64}$/.test(input.digest)))throw Error('Invalid diagnostic status');
 if(input.confirmedAgeMs!==null&&(!Number.isSafeInteger(input.confirmedAgeMs)||input.confirmedAgeMs<0||input.confirmedAgeMs>604800000))throw Error('Invalid confirmation age');
 const out=Object.fromEntries(keys.filter(k=>k!=='performance'&&k!=='transfers'&&k!=='details').map(k=>[k,input[k]]));if(input.performance!==undefined)out.performance=validatePerformance(input.performance);if(input.transfers!==undefined)out.transfers=validateTransferCounters(input.transfers);if(input.details!==undefined)out.details=validateDiagnosticDetails(input.details);return out;
}
// Memory-only, bounded, authenticated callers only. No paths, content, user names,
// errors, tokens, IP addresses or Yjs state are retained in diagnostics.
export class DeviceDiagnostics{
 constructor({now=Date.now,maxDevices=64}={}){this.now=now;this.maxDevices=maxDevices;this.rows=new Map();}
 report(ws,input){const data=validateDiagnostic(input),now=this.now();this.prune(now);const old=this.rows.get(data.deviceId);if(old&&old.ws!==ws&&old.ws.readyState===1)throw Error('Device diagnostic ID already connected; use a separate device identity');for(const [id,row] of this.rows)if(row.ws===ws&&id!==data.deviceId)this.rows.delete(id);if(!old&&this.rows.size>=this.maxDevices)throw Error('Device diagnostic capacity reached');this.rows.set(data.deviceId,{data,ws,time:now});return true;}
 prune(now){for(const [id,r] of this.rows)if(now-r.time>86400000)this.rows.delete(id);}
 snapshot(digest,conflicts){const now=this.now();this.prune(now);return [...this.rows.values()].map(({data,ws,time})=>{const {digest:reportedDigest,...safe}=data,ageMs=Math.max(0,now-time),connected=ws.readyState===1,fresh=ageMs<=DIAGNOSTICS_FRESH_MS,matchesServer=reportedDigest===digest;return {...safe,receivedAt:time,ageMs,connected,fresh,matchesServer,confirmedAgeMs:data.confirmedAgeMs===null?null:data.confirmedAgeMs+ageMs,completeAtReport:connected&&fresh&&data.foreground&&data.ready&&!data.busy&&data.confirmedAgeMs!==null&&data.confirmedAgeMs+ageMs<=DIAGNOSTICS_FRESH_MS&&matchesServer&&counts.every(k=>data[k]===0)&&conflicts===0&&(!data.details||data.details.reasons.length===0)};});}
}
