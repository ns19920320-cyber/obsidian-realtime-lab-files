// Bounded in-memory numeric counters only. No paths, URLs, errors or credentials.
export const PERFORMANCE_CAPABILITY='device-performance-v1';
export const PERFORMANCE_KINDS=['network','cache','vault','config'];
const empty=()=>({count:0,ms:0,maxMs:0,bytes:0,errors:0,wallMs:0});
export class PerformanceCounters{
 constructor({now=()=>performance.now()}={}){this.now=now;this.started=now();this.active=Object.fromEntries(PERFORMANCE_KINDS.map(k=>[k,{count:0,start:0}]));this.buckets=Object.fromEntries(PERFORMANCE_KINDS.map(k=>[k,empty()]));}
 add(kind,ms,bytes=0,error=false){const b=this.buckets[kind];if(!b)return;b.count++;b.ms+=Math.max(0,Math.round(ms));b.maxMs=Math.max(b.maxMs,Math.max(0,Math.round(ms)));b.bytes+=Math.max(0,bytes);if(error)b.errors++;}
 record(kind,ms,bytes=0,error=false){this.add(kind,ms,bytes,error);if(this.buckets[kind])this.buckets[kind].wallMs+=Math.max(0,Math.round(ms));}
 begin(kind){const t=this.now(),a=this.active[kind];if(!a)return ()=>{};if(a.count++===0)a.start=t;let done=false;return (bytes=0,error=false)=>{if(done)return;done=true;const now=this.now();this.add(kind,now-t,bytes,error);if(--a.count===0)this.buckets[kind].wallMs+=Math.max(0,Math.round(now-a.start));};}
 async measure(kind,fn){const done=this.begin(kind);let failed=false;try{return await fn()}catch(e){failed=true;throw e}finally{done(0,failed)}}
 snapshot(){return {elapsedMs:Math.min(1e12,Math.max(0,Math.round(this.now()-this.started))),...Object.fromEntries(PERFORMANCE_KINDS.map(k=>[k,{...this.buckets[k],wallMs:this.buckets[k].wallMs+(this.active[k].count?Math.max(0,Math.round(this.now()-this.active[k].start)):0)}]))};}
}
export function validatePerformance(value){const keys=['elapsedMs',...PERFORMANCE_KINDS];if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k))||!Number.isSafeInteger(value.elapsedMs)||value.elapsedMs<0||value.elapsedMs>1e12)throw Error('Invalid performance counters');const result={elapsedMs:value.elapsedMs};for(const kind of PERFORMANCE_KINDS){const b=value[kind],fields=Object.keys(empty());if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).length!==fields.length||Object.keys(b).some(k=>!fields.includes(k))||fields.some(k=>!Number.isSafeInteger(b[k])||b[k]<0||b[k]>1e12)||b.errors>b.count||b.maxMs>b.ms)throw Error('Invalid performance counters');result[kind]=Object.fromEntries(fields.map(k=>[k,b[k]]));}return result;}
