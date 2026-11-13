#!/usr/bin/env python3
"""Archive an explicitly exported device snapshot directly to NAS; no local backup.
The private snapshot JSON comes from the authenticated protected-review-get API.
"""
import argparse,hashlib,io,json,pathlib,re,shlex,subprocess,tarfile,uuid

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--snapshot',required=True);ap.add_argument('--server-dir',required=True);ap.add_argument('--nas-root',required=True);a=ap.parse_args()
 rec=json.loads(pathlib.Path(a.snapshot).read_text());m=rec['manifest'];ids=[m[k]for k in ['serverId','deviceId','jobId']]
 if not all(re.fullmatch(r'[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}',x)for x in ids):raise ValueError('Invalid snapshot identity')
 if not re.fullmatch(r'/[A-Za-z0-9/_-]+',a.nas_root)or '..'in a.nas_root or a.nas_root.endswith('/'):raise ValueError('Invalid NAS root')
 canonical=json.dumps(m,ensure_ascii=False,separators=(',',':')).encode();digest=hashlib.sha256(canonical).hexdigest()
 if rec.get('sealed')is not True or digest!=rec['digest']:raise ValueError('Snapshot not sealed or digest mismatch')
 server=pathlib.Path(a.server_dir);state_raw=(server/'vault-v3-files.json').read_bytes();state=json.loads(state_raw)
 if state['serverId']!=m['serverId']:raise ValueError('Server identity mismatch')
 if len(m['files'])>6000 or sum(f['size']for f in m['files'])>1024**3:raise ValueError('Snapshot capacity exceeded')
 blobrefs={}
 for f in m['files']:
  p=pathlib.PurePosixPath(f['path'])
  if not f['path']or p.is_absolute()or any(x in ['.','..']or x.startswith('.')for x in f['path'].split('/'))or not re.fullmatch('[a-f0-9]{64}',f['hash']):raise ValueError('Unsafe snapshot path')
  if f['hash']in blobrefs and blobrefs[f['hash']]!=f['size']:raise ValueError('Hash size mismatch')
  blobrefs[f['hash']]=f['size']
 history={f['path']:state['history'].get(f['path'],[])for f in m['files']}
 for versions in history.values():
  for v in versions:
   if not v.get('deleted')and v.get('hash'):blobrefs[v['hash']]=v['size']
 if sum(blobrefs.values())>3*1024**3:raise ValueError('Archive capacity exceeded')
 for h,size in blobrefs.items():
  if not re.fullmatch('[a-f0-9]{64}',h):raise ValueError('Invalid history hash')
  p=server/'blobs'/h
  if p.is_symlink()or p.stat().st_size!=size:raise ValueError('Payload missing')
  with p.open('rb')as f:actual=hashlib.file_digest(f,'sha256').hexdigest()
  if actual!=h:raise ValueError('Payload hash mismatch')
 remote='/'.join([a.nas_root,*ids]);q=shlex.quote
 subprocess.run(['ssh','-o','BatchMode=yes','nas','umask 077; mkdir -p '+q(remote)],check=True,capture_output=True,timeout=20)
 old=subprocess.run(['ssh','-o','BatchMode=yes','nas','cat -- '+q(remote+'/receipt.json')],capture_output=True,timeout=20)
 if old.returncode==0:
  receipt=json.loads(old.stdout);actual=subprocess.check_output(['ssh','nas','sha256sum -- '+q(remote+'/archive.tar.gz')],timeout=30).decode().split()[0]
  if receipt.get('manifestHash')!=digest or receipt.get('archiveSha256')!=actual:raise ValueError('Existing NAS receipt differs; preserved')
  print(json.dumps({'verified':True,'reused':True,'files':len(m['files']),'nasDirectory':remote}));return
 tmp=remote+'/archive.tar.gz.partial-'+str(uuid.uuid4());proc=subprocess.Popen(['ssh','-o','BatchMode=yes','nas','umask 077; cat > '+q(tmp)],stdin=subprocess.PIPE,stderr=subprocess.PIPE);h=hashlib.sha256();count=0
 class Sink:
  def write(self,b):
   nonlocal count
   proc.stdin.write(b);h.update(b);count+=len(b);return len(b)
  def flush(self):proc.stdin.flush()
 def add(t,name,b):
  i=tarfile.TarInfo(name);i.size=len(b);i.mode=0o600;t.addfile(i,io.BytesIO(b))
 try:
  with tarfile.open(fileobj=Sink(),mode='w|gz')as t:
   add(t,'snapshot.json',json.dumps(rec,ensure_ascii=False,indent=2).encode());add(t,'server-state-history.json',state_raw);add(t,'relevant-history.json',json.dumps(history,ensure_ascii=False,indent=2).encode())
   for f in m['files']:
    i=tarfile.TarInfo('files/'+f['path']);i.mode=0o600;i.size=f['size']
    with (server/'blobs'/f['hash']).open('rb')as source:t.addfile(i,source)
   for bh in blobrefs:t.add(server/'blobs'/bh,arcname='retained-history-blobs/'+bh,recursive=False)
  proc.stdin.close()
  if proc.wait(timeout=60)!=0:raise RuntimeError('NAS transfer failed')
 except BaseException:
  if proc.poll()is None:proc.terminate()
  raise
 actual=subprocess.check_output(['ssh','-o','BatchMode=yes','nas','sha256sum -- '+q(tmp)],timeout=30).decode().split()[0]
 if actual!=h.hexdigest():raise ValueError('NAS archive checksum differs')
 subprocess.run(['ssh','nas','tar -tzf '+q(tmp)+' > /dev/null'],check=True,capture_output=True,timeout=90)
 subprocess.run(['ssh','nas','mv -- '+q(tmp)+' '+q(remote+'/archive.tar.gz')],check=True,capture_output=True,timeout=20)
 receipt={'protocol':1,'serverId':m['serverId'],'deviceId':m['deviceId'],'jobId':m['jobId'],'manifestHash':digest,'archiveSha256':actual,'files':len(m['files']),'verified':True}
 raw=json.dumps(receipt,separators=(',',':')).encode();rp=remote+'/receipt.json.tmp-'+str(uuid.uuid4());subprocess.run(['ssh','nas','umask 077; cat > '+q(rp)],input=raw,check=True,capture_output=True,timeout=20);subprocess.run(['ssh','nas','mv -- '+q(rp)+' '+q(remote+'/receipt.json')],check=True,capture_output=True,timeout=20)
 print(json.dumps({'verified':True,'files':len(m['files']),'bytes':count,'nasDirectory':remote,'archiveSha256':actual}))
if __name__=='__main__':main()
