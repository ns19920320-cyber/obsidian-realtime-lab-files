// Presentation only: never change queues, content or approval flags here.
export function pathReviewGroups(items=[],destinations={}){
 const parent=p=>p.slice(0,p.lastIndexOf('/')),name=p=>p.slice(p.lastIndexOf('/')+1);
 const same=(a,b)=>a?.kind===b?.kind&&(a.kind==='text'?a.data===b.data:a.hash===b.hash&&a.size===b.size);
 const sources=new Set(items.flatMap(i=>i.op.entries.map(e=>e.from))),groups=[],batches=new Map();
 for(const i of items){
  const reviewed={id:i.op.id,plan:JSON.stringify(i.op)},lines=[];let inferred=i.op.kind==='delete';
  for(const e of i.op.entries){
   const matches=i.op.kind==='delete'?Object.entries(destinations).filter(([p,c])=>!sources.has(p)&&name(p)===name(e.from)&&same(e.base,c)):[];
   if(matches.length!==1)inferred=false;
   lines.push(e.to?e.from+' → '+e.to:matches.length===1?e.from+' → '+matches[0][0]+'（同内容副本，需确认旧路径清理）':e.from);
  }
  const title=(i.op.kind==='rename'?'重命名':inferred?'疑似移动后旧路径清理':'删除');
  // Grouping is presentation only; each original plan and its exact snapshot
  // remain independently checked when the user confirms the displayed group.
  const key=i.op.kind==='delete'?JSON.stringify([title,!!i.approved,[...new Set(i.op.entries.map(e=>parent(e.from)))].sort()]):null;
  let g=key?batches.get(key):null;
  if(!g){g={id:i.op.id,title:'',count:0,affected:0,state:i.approved?'已批准，等待传播或重试':'等待你确认',error:'',lines:[],reviewed,reviewedItems:[],paths:new Set(),label:title};groups.push(g);if(key)batches.set(key,g);}
  g.count+=i.op.entries.length;g.reviewedItems.push(reviewed);g.lines.push(...lines);if(i.error&&!g.error)g.error=i.error;for(const e of i.op.entries){g.paths.add(e.from);if(e.to)g.paths.add(e.to);}g.affected=g.paths.size;g.title=g.label+' · '+g.count+' 项';
 }
 return groups.map(({paths,label,...g})=>g);
}
/** @param {any} options */
export function syncSections(options={}){const {ready=false,connecting=false,error='',progress,pendingVersions=0,audit,conflicts=0,operations=0,remoteDeletes=0,holds=0}=options;
 const transfer=progress?.available?(ready?'':'离线参考 · ')+'已完成 '+progress.completed+'/'+progress.total+' · 剩余 '+progress.remaining+' · 重试 '+progress.retry+' · 待传版本 '+pendingVersions:'重连后核对进度 · 待传版本 '+pendingVersions;
 let auditText='尚未核对';if(audit){auditText=(audit.enabled?'自动核对已开启':'自动核对未开启')+' · '+(audit.phase==='running'?'正在核对':!audit.checkedAt?'尚无本轮结果':!ready?'上次核对结果 · 离线，待重连复核':!audit.current?'上次结果已过期，待重新核对':'最近核对：一致 '+audit.counts.equal+' · 差异 '+audit.counts.different+' · 未补齐 '+(audit.counts.missing+audit.counts['local-only'])+' · 补收 '+audit.counts.downloaded+' · 补传 '+audit.counts.uploaded+' · 暂缓 '+audit.counts.refused);}
 return [{title:'连接',text:ready?'已连接'+(error?' · 有异常，请查看下方原因':''):connecting?'正在连接或重连':'已断开 · 进度需重新确认',tone:error?'error':ready?'ok':'muted'},{title:'文件传输',text:transfer,tone:progress?.retry?'error':'muted'},{title:'内容核对',text:auditText,tone:audit?.current&&(audit.counts.different||audit.counts.missing||audit.counts['local-only']||audit.counts['read-error'])?'warning':'muted'},{title:'待确认事项',text:'冲突 '+conflicts+' · 本机路径操作 '+operations+' 组 · 远端删除 '+remoteDeletes+' 项 · 一致性保护 '+holds+' 条',tone:conflicts||operations||remoteDeletes||holds?'warning':'muted'}];
}
