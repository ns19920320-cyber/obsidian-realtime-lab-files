export const CONFLICT_CAPABILITY='conflict-review-v1';
export const fingerprint=c=>JSON.stringify(c?c.kind==='text'?{kind:'text',data:c.data}:{kind:c.kind,hash:c.hash,size:c.size}:null);
export const sameContent=(a,b)=>fingerprint(a)===fingerprint(b);
// Bounded linear comparison: the changed contiguous region, not an O(n²) diff.
export function textDifference(a,b){const x=a.slice(0,20000).split('\n'),y=b.slice(0,20000).split('\n');let start=0,end=0;while(start<x.length&&start<y.length&&x[start]===y[start])start++;while(end<x.length-start&&end<y.length-start&&x[x.length-1-end]===y[y.length-1-end])end++;const removed=x.slice(start,x.length-end),added=y.slice(start,y.length-end);return {removed:removed.slice(0,100).map(s=>'− '+s).join('\n'),added:added.slice(0,100).map(s=>'+ '+s).join('\n'),truncated:a.length>20000||b.length>20000||removed.length>100||added.length>100,equal:a===b};}
// Parent/version proof, not timestamps or a device name, establishes a linear
// continuation. Unknown ancestry remains a conflict rather than being guessed.
export const CONFLICT_LINEAGE_CAPABILITY='conflict-linear-heads-v1';
export const KEEP_CURRENT_CAPABILITY='conflict-keep-current-history-v1';
export function retainConflictHistory(list,limit,pinned=[]){const keep=new Set([...pinned,...list.slice(-limit).map(v=>v.id)]);return list.filter(v=>keep.has(v.id));}
export function continueConflictReview(review,before,after,list){
 if(!review||!before?.version||!after?.version)return null;
 const heads=list.filter(v=>review.versions.includes(v.id)&&sameContent(v,before)),previous=list.filter(v=>v.version===before.version&&sameContent(v,before)).at(-1)||(heads.length===1?heads[0]:null),next=list.filter(v=>v.version===after.version&&sameContent(v,after)).at(-1);
 if(!previous||!next||!review.versions.includes(previous.id))return null;
 return {...review,versions:[...new Set(review.versions.map(id=>id===previous.id?next.id:id))]};
}
