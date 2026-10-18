// Optional numeric-only diagnostics. No file names, paths, URLs or credentials.
export const TRANSFER_COUNTERS_CAPABILITY='device-transfer-counters-v1';
export const RANGE_CAPABILITY='bounded-blob-range-v1',RANGE_BYTES=256*1024;
const kinds=['batch','range','chunk'];
const fields=['batchRequests','batchFiles','batchBytes','batchErrors','rangeRequests','rangeBytes','rangeErrors','chunkRequests','chunkBytes','chunkErrors'];
export class TransferCounters{
 constructor(){this.data=Object.fromEntries(fields.map(k=>[k,0]));}
 record(kind,bytes=0,failed=false,files=0){if(!kinds.includes(kind))return;this.data[kind+'Requests']++;this.data[kind+'Bytes']+=bytes;if(failed)this.data[kind+'Errors']++;else if(kind==='batch')this.data.batchFiles+=files;}
 snapshot(){return {...this.data};}
}
export function validateTransferCounters(v){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==fields.length||Object.keys(v).some(k=>!fields.includes(k))||fields.some(k=>!Number.isSafeInteger(v[k])||v[k]<0||v[k]>1e12)||kinds.some(k=>v[k+'Errors']>v[k+'Requests'])||v.batchFiles>16*(v.batchRequests-v.batchErrors))throw Error('Invalid transfer counters');return Object.fromEntries(fields.map(k=>[k,v[k]]));}
