export function badgeState({ready=false,preparing=false,receiving=false,connecting=false,error=false,confirmed=false,uploads=0,downloads=0,unknown=false,known=0,conflicts=0,protectedCount=0,progress, retrying=false,reconnecting=false,pendingVersions=0}){
 let tone='offline',icon='cloud-off',label='离线',busy=false;
 if(ready&&conflicts){tone='error';icon='alert-circle';label='冲突待处理';}
 else if(ready&&protectedCount){tone='waiting';icon='alert-circle';label='路径操作待确认';}
 else if(!ready&&reconnecting){tone='busy';icon='refresh-cw';label='重连中';busy=true;}
 else if(error&&retrying&&ready){tone='busy';icon='refresh-cw';label='恢复中';busy=true;}
 else if(error){tone='error';icon='alert-circle';label='需处理';}
 else if(!ready&&connecting){tone='busy';icon='refresh-cw';label='连接中';busy=true;}
 else if(ready&&(preparing||receiving||uploads||downloads||unknown)){tone='busy';icon='refresh-cw';label=preparing?'准备中':receiving?'接收中':'同步中';busy=true;}
 else if(ready&&!confirmed){tone='waiting';icon='clock';label='待确认';}
 else if(ready){tone='confirmed';icon='check';label='已确认';}
 const legacyCounts='↑'+(unknown?'?':uploads)+' ↓'+downloads;
 let display='Sync: '+(ready&&conflicts?'⚠ 冲突'+conflicts:ready&&protectedCount?'⚠ 待确认'+protectedCount:tone==='confirmed'?'⚡':tone==='busy'?'↻':tone==='waiting'?'◷':tone==='error'?'⚠ 异常':'○ 离线');
 let counts=progress?.available?(ready?'':'上次进度：')+'已完成 '+progress.completed+'/'+progress.total+' · 剩余 '+progress.remaining+' · 待重试 '+progress.retry:progress?'进度待核对':legacyCounts;
 if(progress){counts+=' · 待传/确认 '+(unknown?'待核对':uploads)+'路径'+(pendingVersions?'（'+pendingVersions+'版本）':'')+' · 冲突 '+conflicts;if(!ready)counts+='（当前未核对）';}
 if(progress&&!conflicts&&!protectedCount){display='Sync: '+(label==='重连中'?'重连中':label==='恢复中'?'恢复中':tone==='busy'?'同步中':tone==='confirmed'?'✓':tone==='error'?'⚠ 需处理':label);}
 if(!ready&&reconnecting&&conflicts)display='Sync: 重连中 · 冲突'+conflicts;
 return {tone,icon,label,display,busy,counts,description:(progress?.available?counts+'；当前接收并发'+progress.active+'；待重试仅统计文件失败，不包含连接错误或冲突；':'进度尚未核对；')+label+'；待处理冲突'+conflicts+'；库内'+known+'个路径；待上传或确认'+(unknown?'数量待核对':uploads)+'；当前接收'+downloads+'。点击查看同步详情。服务器确认不等于其他设备已收到。'};
}
export const badgeCSS=`
.rl-sync-row{min-width:0;display:flex;justify-content:flex-end;flex:0 0 auto;min-height:25px;padding:0 18px 3px;background:var(--background-primary);z-index:1}
.rl-sync-row .rl-sync-badge{display:inline-flex;align-items:center;gap:7px;min-width:0;width:max-content;max-width:100%;flex-wrap:wrap;justify-content:flex-end;min-height:24px;padding:0;border:0;border-radius:0;background:transparent;color:var(--text-muted);font-size:12px;font-weight:400;line-height:24px;white-space:nowrap;cursor:pointer;box-shadow:none;font-variant-numeric:tabular-nums}
.rl-sync-badge .rl-sync-icon{display:none}
.rl-sync-badge .rl-sync-label,.rl-sync-badge .rl-sync-counts{min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere;text-align:right}
.rl-sync-badge[data-tone=error]{color:var(--text-error)}
.rl-sync-badge:hover{color:var(--text-normal)}
.rl-sync-badge:focus-visible{outline:2px solid var(--interactive-accent);outline-offset:3px}
body.is-mobile .rl-sync-row{padding:0 20px 2px;min-height:28px;z-index:5;background:transparent;pointer-events:none}
body.is-mobile .rl-sync-row .rl-sync-badge{pointer-events:auto}
body.is-mobile .rl-sync-row .rl-sync-badge{font-size:11px;min-height:28px;line-height:18px;column-gap:6px;row-gap:0}
.rl-history-modal .setting-item-control{flex-wrap:wrap;gap:8px}
.rl-history-modal .modal-title{overflow-wrap:anywhere}
.rl-history-preview{white-space:pre-wrap;overflow-wrap:anywhere;max-height:45vh;overflow:auto;padding:12px;background:var(--background-secondary);font-size:var(--font-smaller)}
.rl-history-image{display:block;max-width:100%;max-height:45vh;object-fit:contain;margin:12px auto}
.rl-sync-details-note{color:var(--text-muted);font-size:var(--font-ui-small);line-height:1.6}
`;
