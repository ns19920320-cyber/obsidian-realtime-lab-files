// Structured, bounded diagnostics. Never transmit raw error text, paths or note content.
export const DIAGNOSTIC_DETAILS_CAPABILITY='device-diagnostic-details-v1';
export const REASON_CODES=['cache-staging-busy','filesystem-transient','network-transient','metadata-not-ready','authentication','identity','quota','persistence','invalid-data','unknown-error','initializing','receiving','uploading','local-operation','transferring','saving','recovering','stopping','conflict-check','conflict','path-review','consistency-hold','consistency-difference'];
export function errorCode(error){const s=String(error?.message||error||'');if(!s)return null;if(REASON_CODES.includes(s))return s;
 if(/Blob request failed \((?:409|429)\)/i.test(s))return 'transferring';
 if(/request failed \((?:408|5\d\d)\)/i.test(s))return 'network-transient';
 if(/^(?:Error: )?(?:Transfer busy|Binary operation busy)$/.test(s))return 'transferring';
 if(/^(?:Error: )?Cache staging busy$/.test(s))return 'cache-staging-busy';
 if(/401|403|Unauthorized|认证/i.test(s))return 'authentication';
 if(/identity mismatch|身份/i.test(s))return 'identity';
 if(/quota|capacity|容量|Active logical content exceeds|metadata\/text state exceeds|path limit|Protected queue identity or capacity/i.test(s))return 'quota';
 if(/snapshot|persist|本地保存|快照/i.test(s))return 'persistence';
 if(/invalid|无效|校验/i.test(s))return 'invalid-data';
 if(/Connect verified V3 metadata|Connect before resuming cached uploads|METADATA_NOT_READY/.test(s))return 'metadata-not-ready';
 if(/File system operation timed out|\b(?:EBUSY|EAGAIN|EMFILE|ENFILE)\b/i.test(s))return 'filesystem-transient';
 if(/network|fetch|load failed|disconnected|not connected|timeout|timed out|Audit interrupted|网络|ECONN|ETIMEDOUT|Foreground reconnect/i.test(s))return 'network-transient';
 return 'unknown-error';}
const auditCounts=['equal','missing','different','local-only','queued','excluded','read-error','downloaded','uploaded','refused'];
const phases=['never','running','waiting','complete','deferred'];
const auditReasons=['none','queue-active','changed','conflict-unverified','baseline-invalid','unknown-error'];
export function validateDiagnosticDetails(v){
 const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&Object.keys(o).every(k=>keys.includes(k));
 const count=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000;
 if(!exact(v,['reasons','audit'])||!Array.isArray(v.reasons)||v.reasons.length>REASON_CODES.length||new Set(v.reasons).size!==v.reasons.length||v.reasons.some(r=>!REASON_CODES.includes(r)))throw Error('Invalid diagnostic details');
 const a=v.audit;if(!exact(a,['enabled','phase','reason','checkedAt','stable','current','limited','counts'])||typeof a.enabled!=='boolean'||!phases.includes(a.phase)||!auditReasons.includes(a.reason)||![a.stable,a.current,a.limited].every(x=>typeof x==='boolean')||!(a.checkedAt===null||Number.isSafeInteger(a.checkedAt)&&a.checkedAt>=0&&a.checkedAt<=8640000000000000)||!exact(a.counts,auditCounts)||!auditCounts.every(k=>count(a.counts[k])))throw Error('Invalid audit diagnostics');
 return {reasons:[...v.reasons],audit:{...a,counts:{...a.counts}}};
}
export function diagnosticDetails(p){const c=p.client,reasons=new Set();for(const e of [p.operationError,c?.lastError,p.conflictError,p.consistencyError,...(p.activeFailures?.()||p.fileFailures).values()]){const code=errorCode(e);if(code)reasons.add(code);}
 const flags={'initializing':p.initializing||!p.syncedOnce,'receiving':p.reflection.queued||p.downloadPaths.size,'uploading':p.fileUploads.queued,'local-operation':p.localOperations||p.writing.size,'transferring':c?.binaryBusy,'saving':p.receiveAcks.size||p.receiptFlush||c?.persistence.dirty||c?.persistence.inFlight,'recovering':p.recoveryBusy,'stopping':p.stopping,'conflict-check':p.conflictError,'conflict':p.conflicts.length,'path-review':p.settings.pathSafety?.items.length||p.settings.remoteDeleteReview?.paths.length,'consistency-hold':p.settings.consistencyHolds?.length,'consistency-difference':p.consistencyIssues()};for(const [k,on] of Object.entries(flags))if(on)reasons.add(k);
 const r=p.consistencyReport,counts=Object.fromEntries(auditCounts.map(k=>[k,k==='refused'?(r?.refused?.length||0):r?.counts?.[k]??r?.[k]??0]));
 return validateDiagnosticDetails({reasons:[...reasons],audit:{enabled:!!p.settings.autoConsistency,phase:p.consistencyBusy?'running':p.consistencyPhase||'never',reason:p.consistencyReason||'none',checkedAt:r?.checkedAt??null,stable:!!r?.stable,current:!p.consistencyBusy&&p.consistencyPhase==='complete'&&!!r?.stable&&r.serverId===c?.serverId&&p.consistencyDigest===p.currentDigest()&&p.consistencyAuditEpoch===p.consistencyEpoch,limited:!!r?.limited,counts}});
}
export function diagnosticDetailsText(d){if(!d)return '详细诊断：设备或服务器尚不支持';const a=d.audit;return '异常/忙碌原因：'+(d.reasons.map(r=>({'cache-staging-busy':'缓存暂存忙碌','filesystem-transient':'文件系统暂时异常','network-transient':'网络暂时异常','metadata-not-ready':'元数据未就绪','authentication':'鉴权失败','identity':'同步空间身份异常','quota':'容量限制','persistence':'本地保存失败','invalid-data':'数据校验异常','unknown-error':'未分类错误（需本机详情）','initializing':'初始化中','receiving':'接收中','uploading':'上传中','local-operation':'本地处理','transferring':'传输中','saving':'保存中','recovering':'重试恢复中','stopping':'正在断开','conflict-check':'冲突检查未确认','conflict':'有冲突','path-review':'删除或重命名待确认','consistency-hold':'一致性保护中','consistency-difference':'一致性有差异'}[r]||r)).join('、')||'无')+'；自动核对：'+(a.enabled?'开启':'关闭')+'；阶段：'+a.phase+'；核对时间：'+(a.checkedAt?new Date(a.checkedAt).toISOString():'尚未核对')+'；结果仍适用：'+a.current+'；结果：'+JSON.stringify(a.counts)+'；暂缓原因：'+a.reason;}

// Keep the existing wire allowlist for older servers; concrete sanitized causes
// travel in reasons, while raw details and the failed stage remain local.
export function auditFailure(error,stage){
 const message=String(error?.message||error),code=stage==='save-baseline'?'persistence':errorCode(error);
 const reason=message.includes('冲突状态')?'conflict-unverified':message.includes('基线无效')?'baseline-invalid':/变化|Audit interrupted/.test(message)?'changed':['network-transient','metadata-not-ready','filesystem-transient','cache-staging-busy','transferring'].includes(code)?'queue-active':'unknown-error';
 return {reason,code};
}
