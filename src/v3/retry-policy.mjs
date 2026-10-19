// Only retry recognisable transport or temporary adapter failures. Authentication, identity, quota,
// invalid data and local persistence failures still require explicit handling.
export function transientTransferFailure(error){
 if(error?.code==='METADATA_NOT_READY')return true;
 const s=String(error?.message||error);
 if(/^(?:Error: )?Connect verified V3 metadata before transferring blobs$/.test(s))return true;
 if(/身份|identity mismatch|认证|401|403|quota|capacity|容量|快照|snapshot|persist|storage|磁盘|本地保存|invalid|unsupported/i.test(s))return false;
 return /Foreground reconnect; local edits retained|blob request failed \(409\)|failed to fetch|fetch failed|load failed|network|网络|ECONN|ENOTFOUND|ETIMEDOUT|disconnected|request timeout|request failed \((?:408|429|5\d\d)\)/i.test(s);
}

// A native adapter timeout does not cancel its original operation. Retry a whole
// reconciliation pass after backoff, never blindly repeat an individual mutation.
export function transientFilesystemFailure(error){return /File system operation timed out|(?:^|\W)(?:EBUSY|EAGAIN|EMFILE|ENFILE)(?:\W|$)/i.test(String(error?.message||error));}
export function recoverableSyncFailure(error){return /^(?:Error: )?Cache staging busy$/.test(String(error?.message||error))||transientFilesystemFailure(error)||transientTransferFailure(error);}
