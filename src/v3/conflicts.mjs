export const CONFLICT_CAPABILITY='conflict-review-v1';
export const fingerprint=c=>JSON.stringify(c?c.kind==='text'?{kind:'text',data:c.data}:{kind:c.kind,hash:c.hash,size:c.size}:null);
export const sameContent=(a,b)=>fingerprint(a)===fingerprint(b);
// Bounded linear comparison: the changed contiguous region, not an O(n²) diff.
export function textDifference(a,b){const x=a.slice(0,20000).split('\n'),y=b.slice(0,20000).split('\n');let start=0,end=0;while(start<x.length&&start<y.length&&x[start]===y[start])start++;while(end<x.length-start&&end<y.length-start&&x[x.length-1-end]===y[y.length-1-end])end++;const removed=x.slice(start,x.length-end),added=y.slice(start,y.length-end);return {removed:removed.slice(0,100).map(s=>'− '+s).join('\n'),added:added.slice(0,100).map(s=>'+ '+s).join('\n'),truncated:a.length>20000||b.length>20000||removed.length>100||added.length>100,equal:a===b};}
