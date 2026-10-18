import {RANGE_CAPABILITY} from './transfer-counters.mjs';
import {GENERAL_FILES_CAPABILITY,fileKind,maxFileSize} from './file-policy.mjs';
import * as Y from 'yjs';
import {encode} from '../client.mjs';
import {FILE_REFS_CAPABILITY,MAX_BINARY,MAX_FILE_TEXT,BLOB_RESPONSE_IDENTITY_CAPABILITY} from './limits.mjs';
import {VaultClient} from '../vault-client.mjs';
import {BlobTransfer} from './blob-client.mjs';
import {put,remove,content,supported} from './model.mjs';
import {transientTransferFailure} from './retry-policy.mjs';
import {CONFLICT_CAPABILITY} from './conflicts.mjs';
import {changedPaths} from './sync-progress.mjs';
export class VaultClientV3 extends VaultClient{
 constructor(options){super({...options,retryPreparation:transientTransferFailure,room:'realtime-lab-v3',expectedProtocol:3,capabilities:[FILE_REFS_CAPABILITY,GENERAL_FILES_CAPABILITY],beforeUpload:async context=>{await options.beforeUpload?.(context);if(!context.isCurrent())return;if(this.pending.length){if(!this.blobCache)throw Error('Pending file cache required');for(const p of this.pending){if(!context.isCurrent())return;await this.putFile(p.path,this.blobCache.source(p),{version:p.version,base:p.base,preserveDeleted:true,prepareOnly:this.serverCapabilities?.includes(CONFLICT_CAPABILITY)});}}},maxBufferedBytes:4*1024*1024,maxInboxBytes:8*1024*1024});this.blobs=new BlobTransfer({url:options.url.replace(/^ws/,'http'),token:options.token,fetchImpl:options.fetchImpl,onTransfer:options.onTransfer,rangeReads:()=>this.serverCapabilities?.includes(RANGE_CAPABILITY),responseIdentity:()=>this.serverCapabilities?.includes(BLOB_RESPONSE_IDENTITY_CAPABILITY),verifyIdentity:async()=>{if(!this.serverId)throw Error('Verified server identity missing; transfers blocked');if(!this.ready&&!this.metadataVerified)throw Object.assign(Error('Connect verified V3 metadata before transferring blobs'),{code:'METADATA_NOT_READY'});return this.serverId;}});this.blobCache=options.blobCache;this.onPending=options.onPending;this.pending=options.pending?.items||[];if(options.pending&&(options.pending.protocol!==3||options.pending.serverId!==this.serverId||!this.serverId))throw Error('Pending uploads require matching verified server identity');if(this.pending.length>6000)throw Error('Pending reference limit');for(const p of this.pending)this.checkPending(p);this.binaryBusy=false;this.binaryAbort=new AbortController();
 this.onSyncState=options.onSyncState||(()=>{});this.onOutbox=options.onOutbox;this.localSequence=0;this.localOutbox=new Map();
 const restored=options.outbox??(options.state?['*']:[]);if(!Array.isArray(restored)||restored.length>8192||restored.some(p=>p!=='*'&&!supported(p)))throw Error('Invalid local outbox');
 for(const p of restored)this.localOutbox.set(p,++this.localSequence);
 const status=this.onStatus;this.onStatus=s=>{this.syncStatus=s;if(/错误|失败|拒绝|阻止|暂停/.test(s))this.lastError=s;status(s);this.onSyncState();};
 const ready=this.onReady;this.onReady=()=>{if(transientTransferFailure(this.lastError))this.lastError='';ready();this.queueConfirmation();};
 this.progressListener=tx=>{if(tx.origin==='remote')return;const paths=changedPaths(this.doc,tx);if(!paths.length)return;for(const p of paths)this.localOutbox.set(p,++this.localSequence);this.onSyncState();this.queueConfirmation();};this.doc.on('afterTransaction',this.progressListener);
 }
 // iOS can retain an OPEN WebSocket after its network connection is gone.
 // Keep the Y.Doc, verified identity and pending blobs; replace only transport.
 connect(){
  const previous=this.ws;super.connect();
  if(!this.ws||this.ws===previous)return;
  this.connectionStartedAt=Date.now();this.terminalCloseCode=undefined;
  const ws=this.ws,closed=ws.onclose;ws.onclose=e=>{if(this.ws===ws&&[4400,4401,4403].includes(e.code))this.terminalCloseCode=e.code;closed?.(e);};
 }
 resume(){
  if(this.stopped||this.transportBlocked||this.terminalCloseCode)return false;
  clearTimeout(this.timer);this.timer=undefined;const old=this.ws;
  this.ws=undefined;this.ready=false;this.metadataVerified=false;
  for(const r of this.requests.values()){clearTimeout(r.timer);r.reject(Error('Foreground reconnect; local edits retained'));}this.requests.clear();
  if(old){old.onopen=null;old.onmessage=null;old.onerror=null;old.onclose=null;try{old.close();}catch{}}
  this.connect();return true;
 }
 queueConfirmation(){clearTimeout(this.confirmTimer);if(this.ready&&!this.stopped)this.confirmTimer=setTimeout(()=>void this.confirmUploads().catch(()=>{}),250);}
 async confirmUploads(){
  if(!this.ready||this.stopped||this.transportBlocked||this.metadataBatch)return false;
  if(this.confirmation)return this.confirmation;
  const ws=this.ws,boundary=this.localSequence;
  this.confirmation=(async()=>{
   await this.request('barrier');if(this.ws!==ws||!this.ready||this.stopped)return false;
   if(this.persistence.persist&&(this.localOutbox.size||this.persistence.dirty||this.persistence.inFlight)){this.flushPersist(!!this.localOutbox.size);if(!await this.persistence.wait())throw Error('Local snapshot save failed; outbox retained');}
   const cleared=[];for(const [p,n] of this.localOutbox)if(n<=boundary){cleared.push([p,n]);this.localOutbox.delete(p);}
   try{if(cleared.length)await this.onOutbox?.([...this.localOutbox.keys()]);}catch(e){for(const [p,n] of cleared)if(!this.localOutbox.has(p))this.localOutbox.set(p,n);throw e;}
   this.lastConfirmedAt=Date.now();this.lastError='';this.onSyncState();return true;
  })().catch(e=>{if(this.ws!==ws)return false;this.lastError=String(e.message||e);this.onSyncState();if(this.ws===ws&&!this.stopped&&!this.transportBlocked&&this.lastError!=='Local snapshot save failed; outbox retained')this.resume();return false;}).finally(()=>{this.confirmation=null;if(this.localSequence>boundary)this.queueConfirmation();});
  return this.confirmation;
 }
 async checkConnection(){
  if(this.stopped||this.transportBlocked||this.terminalCloseCode)return false;
  // A close/error event is not guaranteed on mobile. Recover a stuck handshake
  // or CLOSING socket even when ready is already false. Keep durable state intact.
  if(!this.ready){if(!this.ws||Date.now()-(this.connectionStartedAt||0)>=30000)this.resume();return false;}
  if(this.healthCheck)return this.healthCheck;
  const ws=this.ws;
  // Liveness must not wait behind a native snapshot write in confirmUploads.
  const job=this.request('barrier').then(()=>{if(this.ws!==ws||!this.ready)return false;this.queueConfirmation();return true;}).catch(e=>{if(this.ws===ws&&!this.stopped&&!this.transportBlocked){this.lastError=String(e.message||e);this.onSyncState();this.resume();}return false;});
  this.healthCheck=job;try{return await job;}finally{if(this.healthCheck===job)this.healthCheck=null;}
 }
 get pendingPaths(){return [...this.localOutbox.keys()];}
 async batchFiles(fn){if(this.metadataBatch)throw Error('Metadata batch already active');const vector=Y.encodeStateVector(this.doc);this.metadataBatch=true;try{return await fn();}finally{this.metadataBatch=false;if(this.ready&&!this.stopped)this.send({type:'update',update:encode(Y.encodeStateAsUpdate(this.doc,vector))});this.queueConfirmation();}}
 checkPending(p){if(!p||!p.version||!/^[a-f0-9-]{36}$/.test(p.version)||!supported(p.path)||!/^[a-f0-9]{64}$/.test(p.hash)||!Number.isSafeInteger(p.size)||p.size<0||p.size>maxFileSize(p.path))throw Error('Invalid pending image reference');}
 async putFile(path,source,options={}){if(!supported(path)||source.size>maxFileSize(path))throw Error('Unsupported file or per-type size limit');const transport=this.ws,base=Object.hasOwn(options,'base')?options.base:content(this.doc,path),version=options.version||crypto.randomUUID();const ref=await this.blobs.upload(source,{signal:this.binaryAbort.signal,...options});if(this.stopped)throw Error('Client closed; cached source retained');if(this.ws!==transport||!this.metadataVerified||transport?.readyState!==1)throw Object.assign(Error('Disconnected before version publication; cached source retained'),{code:'METADATA_NOT_READY'});if(options.prepareOnly)return ref;if(this.serverCapabilities?.includes(CONFLICT_CAPABILITY)&&!this.ready)throw Error('Disconnected before version publication; cached source retained');if(this.ready&&this.serverCapabilities?.includes(CONFLICT_CAPABILITY)){await this.request('publish-file',{path,ref,version,base,preserveDeleted:!!options.preserveDeleted});return ref;}this.doc.transact(()=>{const deleted=options.preserveDeleted&&this.doc.getMap('deleted').has(path);put(this.doc,path,{kind:fileKind(path),...ref,version});if(deleted)remove(this.doc,path);});return ref;}

 async downloadFile(path,sink,options){const ref=content(this.doc,path);if(!ref||ref.kind==='text')throw Error('Versioned file missing');return this.blobs.download(ref,sink,{signal:this.binaryAbort.signal,...options});}
 async putImage(path,source,options){if(/\.md$|\.pdf$/i.test(path))throw Error('Image path required');return this.putFile(path,source,options);}
 async downloadImage(path,sink,options){return this.downloadFile(path,sink,options);}
 async stageImage(path,source,options){if(/\.md$|\.pdf$/i.test(path))throw Error('Image path required');return this.stageFile(path,source,options);}
 // Offline staging needs an immutable durable cache plus explicit persisted
 // pending manifest. Only refs enter that manifest; never source byte buffers.
 async stageFile(path,source,options){if(this.binaryBusy)throw Error('Binary operation busy');if(!this.serverId||!this.blobCache||!this.onPending)throw Error('Verified identity, durable blob cache and pending persistence required');if(!supported(path)||source.size>maxFileSize(path))throw Error('Unsupported file or per-type size limit');if(this.pending.length>=6000)throw Error('Pending reference limit');this.binaryBusy=true;try{const ref=await this.blobCache.stage(source,{signal:this.binaryAbort.signal,...options}),previous=[...this.pending].reverse().find(p=>p.path===path),item={path,...ref,version:crypto.randomUUID(),base:previous?{kind:fileKind(path),hash:previous.hash,size:previous.size,version:previous.version}:options&&Object.hasOwn(options,'base')?options.base:content(this.doc,path)};if(previous?.hash===ref.hash&&previous?.size===ref.size)return ref;const next=[...this.pending,item];await this.onPending({protocol:3,serverId:this.serverId,items:next});this.pending=next;this.onSyncState();return ref;}finally{this.binaryBusy=false;}}
 async flushPending(options){if(this.binaryBusy)throw Error('Binary operation busy');if(!this.blobCache||!this.onPending||!this.ready)throw Error('Connect before resuming cached uploads');this.binaryBusy=true;try{while(this.pending.length){const p=this.pending[0];await this.putFile(p.path,this.blobCache.source(p),{...options,version:p.version,base:p.base,preserveDeleted:true});await this.request('barrier');this.flushPersist(true);if(!this.persistence.persist||!await this.persistence.wait())throw Error('Save metadata snapshot before removing pending reference');const next=this.pending.slice(1);await this.onPending({protocol:3,serverId:this.serverId,items:next});this.pending=next;this.onSyncState();}}finally{this.binaryBusy=false;}}
 close(){clearTimeout(this.confirmTimer);this.doc.off('afterTransaction',this.progressListener);this.binaryAbort.abort();return super.close();}
}
