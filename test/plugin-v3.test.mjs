import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import WebSocket from 'ws';
import {createVaultServerV3} from '../src/v3/server.mjs';
import {VaultClientV3} from '../src/v3/client.mjs';
import {put,content,remove} from '../src/v3/model.mjs';
const mock=`export const Platform={isMacOS:true};export class Plugin {registerEvent(){} registerInterval(id){id.unref?.()} registerDomEvent(target,event,cb){(this.domEvents??={})[event]=cb} addCommand(){} addSettingTab(tab){this.testSettingTab=tab} addStatusBarItem(){return {setText(){}}} async loadData(){return null} async saveData(s){this.saved=structuredClone(s)}} export class TFile{constructor(path,size=0){this.path=path;this.stat={size}}} export const setIcon=(el,name)=>el.setAttribute("data-icon",name); export class MarkdownView{} export class App{} export class Modal{constructor(){this.titleEl={setText:s=>this.title=s};this.modalEl={addClass(){}};this.contentEl={buttons:[],createEl(){return {}}};(globalThis.__labModals??=[]).push(this)} open(){} close(){this.closed=true}} export class Notice{constructor(s){}} export class Setting{constructor(el){this.el=el} setName(){return this} setDesc(){return this} addButton(fn){const b={setButtonText(s){this.text=s;return this},setDisabled(v){this.disabled=v;return this},onClick(fn){this.click=fn;return this}};fn(b);this.el.buttons.push(b);return this}} export class PluginSettingTab{constructor(app){this.app=app}} export const normalizePath=p=>p; export async function requestUrl(o){const r=await fetch(o.url,{method:o.method,headers:o.headers,body:o.body});return {status:r.status,headers:Object.fromEntries(r.headers),arrayBuffer:await r.arrayBuffer()}};`;
const output=new URL('./.plugin-v3-under-test.mjs',import.meta.url);
globalThis.WebSocket=WebSocket;globalThis.window=globalThis;
const wait=async(f,ms=3000)=>{for(let i=0;i<ms/10;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timeout');};
function vault(){const data=new Map(),files=new Map(),folders=new Set(),events={};let writes=0,binaryReads=0,maxChunk=0;const v={getName:()=> 'Realtime-Lab-V3-Files-Integration',getFiles:()=>[...files.values()],getAbstractFileByPath:p=>files.get(p)||(folders.has(p)?{path:p}:null),on:(event,cb)=>{(events[event]??=[]).push(cb);return {};},adapter:{stat:async p=>({size:typeof data.get(p)==='string'?new TextEncoder().encode(data.get(p)).length:data.get(p)?.byteLength||0}),list:async p=>({files:[...data.keys()].filter(k=>k.startsWith(p+'/')&&!k.slice(p.length+1).includes('/')),folders:[...folders].filter(k=>k.startsWith(p+'/')&&!k.slice(p.length+1).includes('/'))}),exists:async p=>data.has(p)||folders.has(p),mkdir:async p=>{folders.add(p)},read:async p=>{if(p==='realtime-lab-v3-files.json')return '{"isolatedLab":true,"protocol":3,"capability":"versioned-files-v1"}';return data.get(p);},write:async(p,s)=>{data.set(p,s);writes++;},writeBinary:async(p,s)=>{data.set(p,s);writes++;},readBinary:async p=>{const b=data.get(p);maxChunk=Math.max(maxChunk,b.byteLength);return b;}},read:async f=>data.get(f.path),readBinary:async f=>{binaryReads++;const d=data.get(f.path);return typeof d==='string'?new TextEncoder().encode(d).buffer:d},createFolder:async p=>{folders.add(p)},async create(p,s){const f={path:p,stat:{size:s.length??s.byteLength}};Object.setPrototypeOf(f,fileProto);files.set(p,f);data.set(p,s);for(const cb of events.create||[])cb(f);writes++;return f;},async createBinary(p,s){return this.create(p,s)},async modify(f,s){data.set(f.path,s);f.stat.size=s.length??s.byteLength;for(const cb of events.modify||[])cb(f);writes++;},async modifyBinary(f,s){return this.modify(f,s)},async rename(f,next){const old=f.path;const moved=[...files.values()].filter(x=>x.path===old||x.path.startsWith(old+'/'));for(const x of moved){const from=x.path,to=next+from.slice(old.length),value=data.get(from);files.delete(from);data.delete(from);x.path=to;files.set(to,x);data.set(to,value);}f.path=next;for(const cb of events.rename||[])cb(f,old);},async trash(f){for(const key of [...files.keys()])if(key===f.path||key.startsWith(f.path+'/')){files.delete(key);data.delete(key);}for(const cb of events.delete||[])cb(f);writes++;}};return {v,data,files,get writes(){return writes},get binaryReads(){return binaryReads},get maxChunk(){return maxChunk}};}
const source='import {createRequire} from "node:module";const require=createRequire(import.meta.url);\n'+fs.readFileSync(new URL('../src/v3/plugin.ts',import.meta.url),'utf8')+'\nexport {TFile,MarkdownView};';
await build({stdin:{contents:source,loader:'ts',resolveDir:new URL('../src/v3',import.meta.url).pathname},outfile:output.pathname,bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'stub',setup(b){b.onResolve({filter:/^obsidian$/},()=>({path:'mock',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:mock,loader:'js'}));}}]});
const bundle=await import(output.href+'?bridge');fs.unlinkSync(output);const fileProto=bundle.TFile.prototype;globalThis.document={hidden:false};
const dueRetries=p=>{const ledger=p.ledger();if(ledger)for(const r of ledger.items.values())if(r.retryable)r.nextAt=0;};
const bytesSource=b=>({size:b.length,read:async(p,n)=>b.subarray(p,p+n)});
async function env(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'v3-plugin-')),token='synthetic-native-v3-'.repeat(3),server=await createVaultServerV3({dir,token}),other=new VaultClientV3({url:'ws://127.0.0.1:'+server.port,token,WebSocketImpl:WebSocket}),mem=vault(),p=new bundle.default();p.app={vault:mem.v,plugins:{enabledPlugins:new Set()},workspace:{events:{},on(event,cb){this.events[event]=cb;return {};},onLayoutReady(cb){this.layoutReady=cb;},getLeavesOfType:()=>[]}};await p.onload();p.settings.url=other.url;p.settings.token=token;t.after(async()=>{p.uiUnloaded=true;p.badgeObserver?.disconnect();clearTimeout(p.progressTimer);await p.stop();await other.close();await p.queue;await server.close();fs.rmSync(dir,{recursive:true,force:true});});other.connect();await wait(()=>other.ready);return {p,other,mem,server,dir,token};}
test('V3 plugin adapter receives image via chunk cache and text updates do not reread original binary',async t=>{const {p,other,mem}=await env(t);const bytes=new Uint8Array(32768*3+7).fill(61),ref=await other.putImage('图片/手机.png',bytesSource(bytes));put(other.doc,'文字.md',{kind:'text',data:'first'});await p.start();await wait(()=>mem.files.has('图片/手机.png')&&mem.data.get('文字.md')==='first');assert.deepEqual(new Uint8Array(mem.data.get('图片/手机.png')),bytes);const reads=mem.binaryReads;for(let i=0;i<5;i++){put(other.doc,'文字.md',{kind:'text',data:'文字'+i});await wait(()=>mem.data.get('文字.md')==='文字'+i);}assert.equal(mem.binaryReads,reads);assert(mem.maxChunk<=32768);assert.equal(content(p.client.doc,'图片/手机.png').hash,ref.hash);assert(p.saved.protocol===3);});
test('V3 plugin reads local source once, uploads refs and keeps binary out of settings',async t=>{const {p,other,mem,server}=await env(t);await p.start();await wait(()=>p.client?.ready&&p.syncedOnce);const bytes=new Uint8Array(32768*2+9).fill(47),before=mem.binaryReads;await mem.v.createBinary('电脑.png',bytes.buffer);await wait(()=>content(other.doc,'电脑.png'));assert.equal(mem.binaryReads-before,1);await p.stop();assert(p.saved.state.length<5000);assert(!p.saved.state.includes('Ly8vLy8v'));assert(server.blobs.has(content(other.doc,'电脑.png').hash,bytes.length));assert(mem.maxChunk<=32768);});
test('V3 plugin backs up binary before remote deletion and excludes private cache paths',async t=>{const {p,other,mem,server}=await env(t);const bytes=new Uint8Array([1,3,5,7]);await other.putImage('恢复.png',bytesSource(bytes));await p.start();await wait(()=>mem.files.has('恢复.png'));remove(other.doc,'恢复.png');await wait(()=>!mem.files.has('恢复.png'));assert([...mem.data].some(([k,v])=>k.startsWith('.realtime-lab-v3-recovery/')&&v instanceof ArrayBuffer&&new Uint8Array(v).length===4));assert([...server.doc.getMap('files').keys()].every(k=>!k.startsWith('.')));});
test('V3 plugin refuses legacy settings and V2 markers; explicit rejected-settings backup preserves old state',async t=>{const {p,mem}=await env(t);const old={state:'old-encoded-state',token:'synthetic-legacy-only',url:'ws://127.0.0.1:1'};p.legacyConfig=old;await p.start();assert.equal(p.client,null);await assert.rejects(p.persistConfig(),/拒绝覆盖/);await p.backupRejectedState();assert.equal(p.legacyConfig,null);assert.equal(p.saved.protocol,3);assert([...mem.data].some(([k,v])=>k.includes('rejected-old-settings')&&JSON.parse(v).state===old.state));mem.data.set('realtime-lab-v2.json','{"isolatedLab":true,"protocol":2}');assert.equal(await p.allowed(),false);await p.start();assert.equal(p.client,null);});
test('mobile-compatible chunk cache survives reopen with partial progress and checks quota before writing',async()=>{const {ObsidianBlobCache}=await import('../src/v3/obsidian-cache.mjs'),{hashSource}=await import('../src/v3/sha256.mjs'),m=vault(),b=new Uint8Array(32768*2+7).fill(17),ref={hash:await hashSource(bytesSource(b)),size:b.length};let cache=new ObsidianBlobCache(m.v.adapter);await cache.sink(ref).write(0,b.subarray(0,32768));cache=new ObsidianBlobCache(m.v.adapter);assert.equal(await cache.sink(ref).length(),32768);await cache.sink(ref).write(32768,b.subarray(32768,65536));await cache.sink(ref).write(65536,b.subarray(65536));await cache.sink(ref).commit();assert.deepEqual(new Uint8Array(await cache.materialize(ref)),b);assert(m.maxChunk<=32768);m.data.set('.realtime-lab-v3-cache/quota/state.json',JSON.stringify({size:5*1024*1024}));for(let i=0;i<104;i++){await m.v.adapter.mkdir('.realtime-lab-v3-cache/quota'+i);m.data.set('.realtime-lab-v3-cache/quota'+i+'/state.json',JSON.stringify({size:5*1024*1024}));}cache=new ObsidianBlobCache(m.v.adapter);await assert.rejects(cache.stage(bytesSource(new Uint8Array([1]))),/quota/);});
test('V3 plugin cold restart publishes offline image edits from private chunk cache',async t=>{const {p,mem,other,server}=await env(t);await p.start();await wait(()=>p.client?.ready&&p.syncedOnce);const f=await mem.v.createBinary('重启.png',new Uint8Array([1,2,3]).buffer);await wait(()=>content(other.doc,'重启.png'));p.client.stopped=true;p.client.ws.close();await wait(()=>!p.client.ready);await mem.v.modifyBinary(f,new Uint8Array([4,5,6]).buffer);await p.queue;assert(p.settings.pending?.items.length);await p.stop();const next=new bundle.default();next.app=p.app;await next.onload();next.settings=structuredClone(p.saved);t.after(async()=>{await next.stop();await next.queue;});await next.start();await wait(()=>next.client?.ready&&next.syncedOnce&&next.settings.pending.items.length===0);const ref=content(other.doc,'重启.png');await wait(()=>content(server.doc,'重启.png')?.hash===content(next.client.doc,'重启.png')?.hash);assert.deepEqual([...server.blobs.read(content(server.doc,'重启.png').hash,0)],[4,5,6]);assert([...mem.data.keys()].some(k=>k.startsWith('.realtime-lab-v3-cache/')));});
test('V3 plugin missing pending-only image asks explicit deletion direction before restart publication',async t=>{const {p,mem,other,server}=await env(t);await p.start();await wait(()=>p.client?.ready&&p.syncedOnce);p.client.stopped=true;p.client.ws.close();await wait(()=>!p.client.ready);const f=await mem.v.createBinary('待传删除.png',new Uint8Array([8,7,6]).buffer);await p.queue;assert(p.settings.pending?.items.length);await p.stop();mem.files.delete(f.path);mem.data.delete(f.path);const next=new bundle.default();next.app=p.app;await next.onload();next.settings=structuredClone(p.saved);let asked=false;next.resolveMissing=async paths=>{asked=true;assert(paths.includes(f.path));return 'delete';};t.after(async()=>{await next.stop();await next.queue;});await next.start();await wait(()=>next.client?.ready&&next.syncedOnce);assert(asked);assert.equal(content(server.doc,f.path),null);assert.equal(mem.files.has(f.path),false);assert.equal(next.settings.pending.items.length,0);});
test('Files plugin uses whole-file mode for ordinary Markdown and PDF while retaining inline test-note policy',async t=>{const {p,mem,other}=await env(t);await p.start();await wait(()=>p.client?.ready&&p.syncedOnce);await mem.v.create('普通.md','整文件文字');await wait(()=>content(other.doc,'普通.md')?.kind==='file');assert.equal(other.doc.getText('text:普通.md').length,0);await mem.v.createBinary('附件.pdf',new TextEncoder().encode('%PDF synthetic').buffer);await wait(()=>content(other.doc,'附件.pdf')?.kind==='file');await mem.v.create('实时协作测试.md','逐字协作');await wait(()=>content(other.doc,'实时协作测试.md')?.kind==='text');assert.equal(content(other.doc,'实时协作测试.md').data,'逐字协作');});
test('Files plugin reflects whole-file Markdown and backs up its previous bytes before replacement',async t=>{const {p,mem,other}=await env(t),a=new TextEncoder().encode('整篇第一版'),b=new TextEncoder().encode('整篇第二版');await other.putFile('整篇.md',bytesSource(a));await p.start();await wait(()=>mem.data.get('整篇.md')==='整篇第一版');await other.putFile('整篇.md',bytesSource(b));await wait(()=>mem.data.get('整篇.md')==='整篇第二版');assert([...mem.data].some(([k,v])=>k.startsWith('.realtime-lab-v3-recovery/')&&v instanceof ArrayBuffer&&new TextDecoder().decode(v)==='整篇第一版'));});
test('Files plugin coalesces repeated file events while an upload is blocked instead of queuing one read per event',async t=>{const {p,mem,other}=await env(t);await p.start();await wait(()=>p.client?.ready&&p.syncedOnce);let release,entered=false;const original=p.upload.bind(p),gate=new Promise(r=>release=r);p.upload=async f=>{if(!entered){entered=true;await gate;}return original(f);};t.after(()=>release?.());const f=await mem.v.create('连续.md','v0');await wait(()=>entered);const before=mem.binaryReads;for(let i=1;i<=100;i++)await mem.v.modify(f,'v'+i);assert.equal(p.dirtyFiles.size,1);release();await wait(()=>content(other.doc,'连续.md')?.kind==='file'&&p.dirtyFiles.size===0);await p.queue;assert(mem.binaryReads-before<=2);const ref=content(other.doc,'连续.md');const bytes=await p.cache.materialize(ref);assert.equal(new TextDecoder().decode(bytes),'v100');});

test('Files mobile editor without CM binding uploads while initial file reflection is blocked',async t=>{
 const {p,mem,other,server}=await env(t);
 put(other.doc,'实时协作测试.md',{kind:'text',data:'base'});
 await wait(()=>content(server.doc,'实时协作测试.md')?.data==='base');
 const f=await mem.v.create('实时协作测试.md','base');
 let release,entered=false;const gate=new Promise(r=>release=r),reflect=p.reflect.bind(p);
 p.reflect=async()=>{entered=true;await gate;return reflect();};t.after(()=>release?.());
 await p.start();await wait(()=>entered&&p.syncedOnce);assert(p.initializing);
 const change=p.app.workspace.events['editor-change'];if(typeof change!=='function'){release();await p.queue;}assert.equal(typeof change,'function','mobile editor requires a public editor-change fallback');
 await mem.v.modify(f,'base 手机初始下载期间输入');
 change({getValue:()=> 'base 手机初始下载期间输入'},{file:f});
 await wait(()=>content(server.doc,f.path)?.data==='base 手机初始下载期间输入');
 release();await p.queue;assert.equal(mem.data.get(f.path),'base 手机初始下载期间输入');
});

test('Files cold update recovers an existing unsent phone text file without new input or state reset',async t=>{
 const {p,mem,server,other}=await env(t);put(other.doc,'实时协作测试.md',{kind:'text',data:'base'});
 await wait(()=>content(server.doc,'实时协作测试.md')?.data==='base');await p.start();await wait(()=>p.syncedOnce&&mem.data.get('实时协作测试.md')==='base');
 await p.stop();await p.queue;const saved=structuredClone(p.saved),id=saved.serverId;
 // A suspended old mobile plugin saved the file but missed its editor event.
 mem.data.set('实时协作测试.md','base 新版实时验证 1016');mem.files.get('实时协作测试.md').stat.size=32;
 const next=new bundle.default();next.app=p.app;await next.onload();next.settings=saved;t.after(async()=>{await next.stop();await next.queue;});
 await next.start();await wait(()=>next.syncedOnce&&content(server.doc,'实时协作测试.md')?.data==='base 新版实时验证 1016');
 assert.equal(next.settings.serverId,id);assert.equal(mem.data.get('实时协作测试.md'),'base 新版实时验证 1016');
 assert([...mem.data].some(([k,v])=>k.startsWith('.realtime-lab-v3-recovery/')&&v==='base 新版实时验证 1016'));
});

test('Files visibility resume preserves the live document and automatically sends existing offline edits',async t=>{
 const {p,mem,server,other}=await env(t);put(other.doc,'实时协作测试.md',{kind:'text',data:'base'});await wait(()=>content(server.doc,'实时协作测试.md')?.data==='base');
 await p.start();await wait(()=>p.syncedOnce&&mem.data.get('实时协作测试.md')==='base');const old=p.client.ws,doc=p.client.doc,id=p.client.serverId;
 old.send=()=>{};p.app.workspace.events['editor-change']({getValue:()=> 'base 手机已存文字'},{file:mem.files.get('实时协作测试.md')});assert.equal(content(server.doc,'实时协作测试.md').data,'base');
 p.domEvents.visibilitychange();await wait(()=>p.client.ready&&p.client.ws!==old&&content(server.doc,'实时协作测试.md')?.data==='base 手机已存文字');
 assert.equal(p.client.doc,doc);assert.equal(p.client.serverId,id);
});

test('Files failed online upload retains durable blob and visible retry path until successful retry',async t=>{
 const {p,mem,other}=await env(t);await p.start();await wait(()=>p.syncedOnce);const upload=p.client.blobs.upload.bind(p.client.blobs);let fail=true;p.client.blobs.upload=async(...args)=>{if(fail)throw Error('Synthetic upload interruption');return upload(...args);};
 await mem.v.createBinary('队列重试.png',new Uint8Array([21,22,23]).buffer);await p.queue;
 assert(p.fileFailures.has('队列重试.png'));assert(p.dirtyFiles.has('队列重试.png'));assert.equal(p.settings.pending.items.length,1);assert(p.pendingRows().some(r=>r.path==='队列重试.png'&&r.state==='失败，可重试'));
 fail=false;await p.retryQueue();await p.queue;await wait(()=>content(other.doc,'队列重试.png'));assert.equal(p.settings.pending.items.length,0);assert.equal(p.fileFailures.size,0);assert.equal(p.dirtyFiles.size,0);await p.client.confirmUploads();assert.equal(p.pendingRows().length,0);
});
test('Files startup honors existing auto-connect choice without resetting content or identity',async t=>{
 const {p,mem,server}=await env(t);p.settings.enabled=false;p.app.workspace.layoutReady();assert.equal(p.client,null);
 p.settings.enabled=true;p.app.workspace.layoutReady();await wait(()=>p.syncedOnce);const id=p.settings.serverId;assert.equal(id,server.serverId);assert.equal(p.settings.enabled,true);
 await mem.v.create('自动连接保留.md','content retained');await p.queue;await p.stop();assert.equal(mem.data.get('自动连接保留.md'),'content retained');assert.equal(p.settings.serverId,id);assert.equal(p.settings.enabled,true);
});

test('Files status never equates socket readiness with confirmed upload completion',async t=>{
 const {p,server}=await env(t);await p.start();await wait(()=>p.syncedOnce);await p.client.confirmUploads();assert.equal(p.summaryStatus(),'已提交服务器');
 const old=p.client.ws;old.send=()=>{};put(p.client.doc,'待确认.md',{kind:'text',data:'not acknowledged'});assert.match(p.summaryStatus(),/待上传或确认/);assert(!content(server.doc,'待确认.md'));p.fileFailures.set('失败.md','synthetic');assert.match(p.summaryStatus(),/失败项目/);
});


test('header badge follows connection and queue without duplication in reading and editing views',async t=>{
 const {JSDOM}=await import('jsdom');const dom=new JSDOM('<div class="view-header"></div>');const proto=dom.window.HTMLElement.prototype;
 proto.empty=function(){this.replaceChildren()};proto.addClass=function(...c){this.classList.add(...c)};proto.setText=function(s){this.textContent=s};proto.createSpan=function(o){const e=dom.window.document.createElement('span');e.className=o.cls;this.append(e);return e};
 const {p}=await env(t);const oldDocument=globalThis.document;globalThis.document=dom.window.document;t.after(()=>{globalThis.document=oldDocument});let opened=0;p.openSyncDetails=()=>opened++;
 const header=dom.window.document.querySelector('div'),view=new bundle.MarkdownView();view.file=new bundle.TFile('实时协作测试.md');view.addAction=(icon,title,cb)=>{const el=dom.window.document.createElement('div');el.addEventListener('click',cb);header.append(el);return el};
 view.contentEl=dom.window.document.createElement('div');header.after(view.contentEl);let leaves=[{view}];p.app.workspace.getLeavesOfType=()=>leaves;p.app.workspace.getActiveViewOfType=()=>view;
 p.syncBadges();assert.equal(dom.window.document.querySelectorAll('.rl-sync-badge').length,1);assert.equal(dom.window.document.querySelector('.rl-sync-badge').dataset.tone,'offline');
 dom.window.document.body.classList.add('is-mobile');view.containerEl=dom.window.document.body;header.getBoundingClientRect=()=>({bottom:96,height:44});p.syncBadges();assert.equal(dom.window.document.querySelector('.rl-sync-row').style.top,'100px','mobile row anchored below the actual toolbar, not viewport top');
 const background=new bundle.MarkdownView();background.file=new bundle.TFile('后台.md');background.containerEl=view.containerEl;background.contentEl=dom.window.document.createElement('div');header.after(background.contentEl);leaves.push({view:background});p.syncBadges();assert.equal(dom.window.document.querySelectorAll('.rl-sync-row').length,1,'background mobile tabs must not overlay the active status');
 p.app.workspace.getActiveViewOfType=()=>background;p.syncBadges();assert.equal(dom.window.document.querySelectorAll('.rl-sync-row').length,1,'switching mobile tabs replaces the previous status');p.app.workspace.getActiveViewOfType=()=>null;p.syncBadges();assert.equal(dom.window.document.querySelectorAll('.rl-sync-row').length,0,'no active Markdown view hides the floating status');p.app.workspace.getActiveViewOfType=()=>view;
 p.dirtyFiles.set('a.md',new bundle.TFile('a.md'));p.syncBadges();assert.match(dom.window.document.body.textContent,/进度待核对/);
 p.syncBadges();assert.equal(dom.window.document.querySelectorAll('.rl-sync-badge').length,1);dom.window.document.querySelector('.rl-sync-badge').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(opened,1);
 dom.window.document.querySelector('.rl-sync-row').remove();p.syncBadges();assert.equal(dom.window.document.querySelectorAll('.rl-sync-badge').length,1,'recreated reading/editing header');
 p.fileFailures.set('a.md','failure');p.syncBadges();assert.equal(dom.window.document.querySelector('.rl-sync-badge').dataset.tone,'error');
 leaves=[];p.syncBadges();assert.equal(dom.window.document.querySelectorAll('.rl-sync-badge').length,0);dom.window.close();
});

test('automatic reconnect drains retained dirty files and clears transient queue failures without typing',async t=>{
 const {p,mem,other}=await env(t);await p.start();await wait(()=>p.client?.ready&&p.syncedOnce&&!p.initializing);
 const upload=p.client.blobs.upload.bind(p.client.blobs);let fail=true;p.client.blobs.upload=async(...args)=>{if(fail)throw new TypeError('Failed to fetch');return upload(...args)};
 await mem.v.create('自动补传.md','existing offline words');await wait(()=>p.fileFailures.has('自动补传.md'));await p.queue;assert(p.settings.pending.items.length);
 fail=false;p.client.resume();await wait(()=>p.client.ready&&!p.initializing&&content(other.doc,'自动补传.md'));await p.queue;
 assert.equal(p.dirtyFiles.size,0);assert.equal(p.fileFailures.size,0);await p.client.confirmUploads();assert.equal(p.pendingRows().length,0);
});

test('foreground recovery retries transient HTTP upload failures but leaves storage failures for explicit action',async t=>{
 const {p,mem,other}=await env(t);await p.start();await wait(()=>p.client?.ready&&p.syncedOnce&&!p.initializing);
 const upload=p.client.blobs.upload.bind(p.client.blobs);let fail=true;p.client.blobs.upload=async(...args)=>{if(fail)throw Error('Blob request failed (503)');return upload(...args)};
 await mem.v.create('联网自动恢复.md','no repeated typing');await wait(()=>p.fileFailures.size);await p.queue;
 fail=false;dueRetries(p);await p.recoverQueue();await wait(()=>content(other.doc,'联网自动恢复.md'));await p.queue;await p.client.confirmUploads();assert.equal(p.pendingRows().length,0);
 p.fileFailures.set('磁盘.md','Local storage quota exceeded');p.operationError='Local storage quota exceeded';let tried=false;p.retryQueue=async()=>{tried=true};dueRetries(p);await p.recoverQueue();assert.equal(tried,false);assert(p.fileFailures.has('磁盘.md'));
});


test('folder rename moves Markdown and images with recoverable old paths and no lost local updates',async t=>{
 const {p,mem,other,server}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);
 const f=await mem.v.create('批量/笔记.md','folder text');await mem.v.createBinary('批量/图片.png',new Uint8Array([1,8,2]).buffer);await p.queue;await wait(()=>content(other.doc,'批量/图片.png'));
 await mem.v.rename({path:'批量'},'重命名');await p.queue;await wait(()=>content(other.doc,'重命名/图片.png'));
 assert.equal(content(other.doc,'批量/图片.png'),null);assert.equal(content(other.doc,'批量/笔记.md'),null);assert(content(other.doc,'重命名/笔记.md'));assert((await p.client.request('history',{path:'批量/图片.png'})).some(v=>!v.deleted));assert.equal(mem.data.get('重命名/笔记.md'),'folder text');await mem.v.trash({path:'重命名'});await p.queue;await wait(()=>content(other.doc,'重命名/图片.png')===null);assert.equal(content(other.doc,'重命名/笔记.md'),null);assert((await p.client.request('history',{path:'重命名/图片.png'})).some(v=>!v.deleted));
});
test('one failed image download does not block another file and failed local uploads are not overwritten',async t=>{
 const {p,mem,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);
 p.client.serverCapabilities=p.client.serverCapabilities.filter(x=>x!=='small-blob-batch-v1');const bad=await other.blobs.upload(bytesSource(new Uint8Array([11,12]))),good=await other.blobs.upload(bytesSource(new Uint8Array([13,14])));const download=p.client.blobs.download.bind(p.client.blobs);let fail=true;p.client.blobs.download=async(ref,...args)=>{if(fail&&ref.hash===bad.hash)throw new TypeError('Failed to fetch');return download(ref,...args)};
 await other.batchFiles(async()=>{put(other.doc,'失败.png',{kind:'image',...bad});put(other.doc,'继续.png',{kind:'image',...good});});await wait(()=>mem.files.has('继续.png'));assert(p.fileFailures.has('失败.png'));assert(!mem.files.has('失败.png'));
 fail=false;await p.retryQueue();await p.queue;assert(mem.files.has('失败.png'));assert(!p.fileFailures.has('失败.png'));
 const note=await mem.v.create('本地保留.md','original');await p.queue;const upload=p.client.blobs.upload.bind(p.client.blobs);p.client.blobs.upload=async()=>{throw new TypeError('Failed to fetch')};await mem.v.modify(note,'local unsent');await p.queue;await p.reflect();assert.equal(mem.data.get(note.path),'local unsent');assert(p.dirtyFiles.has(note.path));p.client.blobs.upload=upload;await p.retryQueue();await p.queue;assert.equal(mem.data.get(note.path),'local unsent');
});
test('history restore backs up current bytes, refuses unsent changes, and copy leaves source intact',async t=>{
 const {p,mem,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);const f=await mem.v.create('历史恢复.md','first');await p.queue;const versions=await p.client.request('history',{path:f.path}),id=versions.find(v=>!v.deleted).id;
 await mem.v.modify(f,'second');await p.queue;await p.client.confirmUploads();const expected=content(p.client.doc,f.path);await p.restoreVersion(f.path,id,'恢复副本/历史.md',null);await wait(()=>mem.data.get('恢复副本/历史.md')==='first');assert.equal(mem.data.get(f.path),'second');
 p.dirtyFiles.set(f.path,f);await assert.rejects(p.restoreVersion(f.path,id,f.path,expected),/待传/);p.dirtyFiles.delete(f.path);await p.restoreVersion(f.path,id,f.path,expected);await wait(()=>mem.data.get(f.path)==='first');assert([...mem.data].some(([k,v])=>k.startsWith('.realtime-lab-v3-recovery/')&&v instanceof ArrayBuffer&&new TextDecoder().decode(v)==='second'));
});

test('renamed image keeps newer unsent bytes through network failure and retry without resurrecting old path',async t=>{
 const {p,mem,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);const f=await mem.v.createBinary('原图.png',new Uint8Array([1,2]).buffer);await p.queue;const upload=p.client.blobs.upload.bind(p.client.blobs);let fail=true;p.client.blobs.upload=async(...args)=>{if(fail)throw new TypeError('Failed to fetch');return upload(...args)};
 await mem.v.modifyBinary(f,new Uint8Array([9,8,7]).buffer);await p.queue;await mem.v.rename(f,'子目录/新图.png');await p.queue;assert(p.dirtyFiles.has(f.path));await p.reflect();assert.deepEqual([...new Uint8Array(mem.data.get(f.path))],[9,8,7]);fail=false;await p.retryQueue();await p.queue;await wait(()=>content(other.doc,f.path)?.size===3);assert.equal(content(other.doc,'原图.png'),null);assert.equal(p.pendingRows().length,0);
});

test('plugin exposes conflict count, refuses decisions with pending edits, and keeps all variants as copies',async t=>{
 const {p,mem,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);const f=await mem.v.create('冲突处理.md','base');await p.queue;const base=content(other.doc,f.path);await mem.v.modify(f,'Mac branch');await p.queue;await other.putFile(f.path,bytesSource(new TextEncoder().encode('offline branch')),{base});await p.queue;await p.refreshConflicts();assert.equal(p.conflicts.length,1);assert.match(p.summaryStatus(),/冲突/);assert.match(p.badgeModel().display,/冲突1/);const review=p.conflicts[0],expected=content(p.client.doc,f.path);p.dirtyFiles.set(f.path,f);await assert.rejects(p.resolveConflict(review,'keep-both',undefined,expected),/待传/);p.dirtyFiles.delete(f.path);await p.resolveConflict(review,'keep-both',undefined,expected);assert.equal(p.conflicts.length,0);assert.equal([...mem.files.keys()].filter(p=>p.startsWith('冲突副本/')).length,2);assert.equal(content(p.client.doc,f.path).hash,expected.hash);
});

test('hot update removes orphan status and unloaded callbacks cannot recreate it',async t=>{
 const {JSDOM}=await import('jsdom');const dom=new JSDOM('<div class="view-header"></div><div class="view-content"></div>');const proto=dom.window.HTMLElement.prototype;
 proto.addClass=function(...c){this.classList.add(...c)};proto.setText=function(s){this.textContent=s};proto.createSpan=function(o){const e=dom.window.document.createElement('span');e.className=o.cls;this.append(e);return e};
 const prior=globalThis.document;globalThis.document=dom.window.document;t.after(()=>{globalThis.document=prior;dom.window.close()});
 const p=new bundle.default(),view=new bundle.MarkdownView();view.file=new bundle.TFile('实时协作测试.md');view.containerEl=dom.window.document.body;view.contentEl=dom.window.document.querySelector('.view-content');dom.window.document.body.classList.add('is-mobile');dom.window.document.querySelector('.view-header').getBoundingClientRect=()=>({height:44,bottom:96});
 p.app={vault:{getName:()=> 'Realtime-Lab-V3-Files-HotUpdate'},workspace:{getLeavesOfType:()=>[{view}],getActiveViewOfType:()=>view}};
 const orphan=dom.window.document.createElement('div');orphan.className='rl-sync-row';orphan.textContent='Sync: ○ 离线';dom.window.document.body.append(orphan);
 p.syncBadges();assert.equal(dom.window.document.querySelectorAll('.rl-sync-row').length,1,'new instance removes old orphan row');
 const delayedOrphan=orphan.cloneNode(true);dom.window.document.body.append(delayedOrphan);await new Promise(r=>setTimeout(r,0));assert.equal(dom.window.document.querySelectorAll('.rl-sync-row').length,1,'late legacy row from the replaced build is removed without waiting for new sync traffic');
 p.onunload();p.setConnectionStatus('late close callback');p.updateProgress();p.renderProgress();p.syncBadges();
 await new Promise(r=>setTimeout(r,150));assert.equal(dom.window.document.querySelectorAll('.rl-sync-row').length,0,'late asynchronous callbacks cannot recreate an unloaded status');
});

test('plugin reports anonymous queue counts without paths or credentials and preserves diagnostic identity',async t=>{
 const {p,server}=await env(t),id=p.settings.deviceId;assert.match(id,/^[a-f0-9-]{36}$/);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.client.confirmUploads();await p.reportDiagnostic();let result=await p.client.request('device-diagnostics');const row=result.devices.find(d=>d.deviceId===id);assert(row);assert.equal(row.platform,'macos');assert.equal(row.queued,0);assert(!JSON.stringify(result).includes(p.settings.token));assert(!JSON.stringify(result).includes('实时协作测试.md'));p.dirtyFiles.set('private-name.md',new bundle.TFile('private-name.md'));await p.reportDiagnostic();result=await p.client.request('device-diagnostics');assert.equal(result.devices.find(d=>d.deviceId===id).dirty,1);assert.equal(result.devices.find(d=>d.deviceId===id).completeAtReport,false);assert(!JSON.stringify(result).includes('private-name'));p.dirtyFiles.clear();await p.persistConfig();assert.equal(p.saved.deviceId,id);assert(server.writeCount>=1);
});

test('diagnostics does not mark complete while remote contents are still being written locally',async t=>{
 const {p,other,mem}=await env(t);put(other.doc,'实时协作测试.md',{kind:'text',data:'before'});await p.start();await wait(()=>mem.data.get('实时协作测试.md')==='before'&&!p.initializing);await p.client.confirmUploads();let release,entered=false;const gate=new Promise(r=>release=r),modify=mem.v.modify;mem.v.modify=async(f,s)=>{entered=true;await gate;return modify(f,s)};t.after(()=>release());put(other.doc,'实时协作测试.md',{kind:'text',data:'after'});await wait(()=>entered);await p.reportDiagnostic();const row=(await p.client.request('device-diagnostics')).devices.find(d=>d.deviceId===p.settings.deviceId);assert(row.busy);assert.equal(row.completeAtReport,false);release();await p.queue;await wait(()=>mem.data.get('实时协作测试.md')==='after');
});

test('protected local deletion waits when source changed, and cancel restores newer remote content',async t=>{
 const {p,mem,other}=await env(t);await other.putFile('保护删除.md',bytesSource(new TextEncoder().encode('base')));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.has('保护删除.md'));await mem.v.trash(mem.files.get('保护删除.md'));await p.queue;assert.equal(p.settings.pathSafety.items.length,1);await other.putFile('保护删除.md',bytesSource(new TextEncoder().encode('remote newer')));await p.flushPathSafety();assert.match(p.settings.pathSafety.items[0].error,/Source changed/);assert(content(other.doc,'保护删除.md'));await p.cancelPathSafety();await wait(()=>mem.data.get('保护删除.md')==='remote newer');assert.equal(p.settings.pathSafety.items.length,0);
});
test('five local deletes are held durably until reviewed, with backups before propagation',async t=>{
 const {p,mem,other}=await env(t);for(let i=0;i<5;i++)await other.putFile('批删/'+i+'.md',bytesSource(new TextEncoder().encode('synthetic '+i)));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.size===5);for(const f of [...mem.files.values()])await mem.v.trash(f);await p.queue;await p.flushPathSafety();assert.equal(p.settings.pathSafety.items.length,5);assert.equal(p.saved.pathSafety.items.length,5);assert([...other.doc.getMap('files').keys()].filter(x=>content(other.doc,x)).length===5);assert(p.pendingRows().length>=5);await p.approvePathSafety();await wait(()=>[...other.doc.getMap('files').keys()].every(x=>content(other.doc,x)===null));assert.equal(p.settings.pathSafety.items.length,0);assert([...mem.data.keys()].filter(x=>x.startsWith('.realtime-lab-v3-recovery/')).length>=5);
});
test('legacy bulk remote deletion persists a review and preserves local files until approval',async t=>{
 const {p,mem,other}=await env(t);for(let i=0;i<5;i++)await other.putFile('远端批删/'+i+'.md',bytesSource(new TextEncoder().encode('keep '+i)));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.size===5);await other.batchFiles(async()=>{for(let i=0;i<5;i++)remove(other.doc,'远端批删/'+i+'.md');});await wait(()=>p.settings.remoteDeleteReview);await p.queue;assert.equal(mem.files.size,5);assert.equal(p.saved.remoteDeleteReview.paths.length,5);assert.equal(p.pendingRows().length,5);const review=p.settings.remoteDeleteReview;review.approved=true;await p.persistConfig();await p.reflect();assert.equal(mem.files.size,0);assert.equal(p.settings.remoteDeleteReview,undefined);assert([...mem.data.keys()].filter(x=>x.startsWith('.realtime-lab-v3-recovery/')).length>=5);
});
test('an offline queued rename survives plugin restart and publishes latest local bytes once',async t=>{
 const {p,mem,other}=await env(t);await other.putFile('离线旧.png',bytesSource(new Uint8Array([1,2])));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.has('离线旧.png'));p.client.ws.close();await wait(()=>!p.client.ready);const f=mem.files.get('离线旧.png');await mem.v.rename(f,'离线新.png');await mem.v.modifyBinary(f,new Uint8Array([8,9,10]).buffer);await p.queue;const saved=structuredClone(p.settings);assert.equal(saved.pathSafety.items.length,1);await p.stop();const next=new bundle.default();next.app=p.app;next.loadData=async()=>saved;await next.onload();t.after(async()=>{next.onunload();await next.queue;});await next.start();await wait(()=>content(other.doc,'离线新.png')?.size===3&&content(other.doc,'离线旧.png')===null);assert.deepEqual([...new Uint8Array(mem.data.get('离线新.png'))],[8,9,10]);assert.equal(next.settings.pathSafety.items.length,0);assert.equal((await next.client.request('history',{path:'离线新.png'})).filter(v=>!v.deleted).length,1);
});

test('occupied rename target is not overwritten; cancellation preserves native bytes as a recovery copy',async t=>{
 const {p,mem,other}=await env(t);await other.putFile('来源.md',bytesSource(new TextEncoder().encode('source bytes')));await other.putFile('已有.md',bytesSource(new TextEncoder().encode('occupied bytes')));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.size===2);await mem.v.rename(mem.files.get('来源.md'),'已有.md');await p.queue;await p.flushPathSafety();assert.match(p.settings.pathSafety.items[0].error,/target exists/);const original=content(other.doc,'已有.md');await p.cancelPathSafety();assert.equal(content(other.doc,'已有.md').hash,original.hash);assert.equal(mem.data.get('已有.md'),'occupied bytes');assert.equal(mem.data.get('来源.md'),'source bytes');assert([...mem.files.keys()].some(x=>x.startsWith('恢复副本/取消路径操作-')));
});
test('lost protected operation acknowledgement retries without repeated backups or duplicate versions',async t=>{
 const {p,mem,other}=await env(t);await other.putFile('重试旧.png',bytesSource(new Uint8Array([3,4,5])));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.has('重试旧.png'));await mem.v.rename(mem.files.get('重试旧.png'),'重试新.png');await p.queue;const request=p.client.request.bind(p.client);let lost=true;p.client.request=async(type,args)=>{const result=await request(type,args);if(type==='path-operation'&&lost){lost=false;throw new TypeError('Lost acknowledgement');}return result;};await p.flushPathSafety();assert.equal(p.settings.pathSafety.items.length,1);const count=[...mem.data.keys()].filter(x=>x.startsWith('.realtime-lab-v3-recovery/')).length;await p.flushPathSafety();assert.equal(p.settings.pathSafety.items.length,0);assert.equal([...mem.data.keys()].filter(x=>x.startsWith('.realtime-lab-v3-recovery/')).length,count);assert.equal((await request('history',{path:'重试新.png'})).length,1);assert.equal(content(other.doc,'重试旧.png'),null);
});

test('reviewed folder rename syncs its image and Obsidian-updated links together without changing bytes',async t=>{
 const {p,mem,other}=await env(t);const files={'原目录/引用.md':'![[原目录/图.png]]','原目录/一.md':'one','原目录/二.md':'two','原目录/三.md':'three'};for(const [path,text] of Object.entries(files))await other.putFile(path,bytesSource(new TextEncoder().encode(text)));await other.putImage('原目录/图.png',bytesSource(new Uint8Array([7,6,5])));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.size===5);const imageHash=content(other.doc,'原目录/图.png').hash;await mem.v.rename({path:'原目录'},'新目录');await mem.v.modify(mem.files.get('新目录/引用.md'),'![[新目录/图.png]]');await p.queue;await p.flushPathSafety();assert.equal(p.settings.pathSafety.items.length,1);await p.approvePathSafety();await wait(()=>content(other.doc,'新目录/图.png'));assert.equal(content(other.doc,'新目录/图.png').hash,imageHash);assert.equal(mem.data.get('新目录/引用.md'),'![[新目录/图.png]]');assert(Object.keys(files).every(path=>content(other.doc,path)===null));assert.equal(p.settings.pathSafety.items.length,0);
});
test('remote delete approval expires if server changes before the local deletion is applied',async t=>{
 const {p,mem,other}=await env(t);for(let i=0;i<5;i++)await other.putFile('审阅/'+i+'.md',bytesSource(new TextEncoder().encode('saved '+i)));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.size===5);await other.batchFiles(async()=>{for(let i=0;i<5;i++)remove(other.doc,'审阅/'+i+'.md');});await wait(()=>p.settings.remoteDeleteReview);const review=p.settings.remoteDeleteReview;review.approved=true;await other.putFile('新变化.md',bytesSource(new TextEncoder().encode('different snapshot')));await wait(()=>p.settings.remoteDeleteReview!==review);assert.equal(p.settings.remoteDeleteReview.approved,false);assert([...mem.files.keys()].filter(x=>x.startsWith('审阅/')).length===5);
});
test('confirmed deletion of missing files after stopped-period editing still uses a stale-base guard',async t=>{
 const {p,mem,other}=await env(t);await other.putFile('停用缺失.md',bytesSource(new TextEncoder().encode('old')));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.has('停用缺失.md'));await p.stop();await mem.v.trash(mem.files.get('停用缺失.md'));await other.putFile('停用缺失.md',bytesSource(new TextEncoder().encode('new remote edit')));p.resolveMissing=async()=> 'delete';await p.start();await wait(()=>p.settings.pathSafety?.items[0]?.error);assert.match(p.settings.pathSafety.items[0].error,/Source changed/);assert(content(other.doc,'停用缺失.md'));assert.equal(mem.files.has('停用缺失.md'),false);await p.cancelPathSafety();await wait(()=>mem.data.get('停用缺失.md')==='new remote edit');
});

test('path review only approves the displayed plans and refuses a changed prepared plan',async t=>{
 const {p,mem,other}=await env(t);for(let i=0;i<6;i++)await other.putFile('范围/'+i+'.md',bytesSource(new TextEncoder().encode('protected '+i)));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.size===6);for(let i=0;i<5;i++)await mem.v.trash(mem.files.get('范围/'+i+'.md'));await p.queue;const reviewed=p.settings.pathSafety.items.map(i=>({id:i.op.id,plan:JSON.stringify(i.op)}));await mem.v.trash(mem.files.get('范围/5.md'));await p.queue;await p.approvePathSafety(reviewed);assert.equal(p.settings.pathSafety.items.length,1);assert(content(other.doc,'范围/5.md'));assert.equal(p.settings.pathSafety.items[0].approved,false);await p.flushPathSafety();assert.equal(p.settings.pathSafety.items.length,1,'remaining bulk members must not silently turn into auto-approved single deletes');assert(content(other.doc,'范围/5.md'));const stale=[{id:p.settings.pathSafety.items[0].op.id,plan:'different'}];await assert.rejects(p.approvePathSafety(stale),/计划已变化/);assert(content(other.doc,'范围/5.md'));
});

test('delete approval is bound to the deletion generation even when material state returns to the same tombstone',async t=>{
 const {p,mem,other}=await env(t);for(let i=0;i<5;i++)await other.putFile('代次/'+i+'.md',bytesSource(new TextEncoder().encode('original '+i)));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.size===5);await other.batchFiles(async()=>{for(let i=0;i<5;i++)remove(other.doc,'代次/'+i+'.md');});await wait(()=>p.settings.remoteDeleteReview);const review=p.settings.remoteDeleteReview;review.approved=true;const ref=await other.blobs.upload(bytesSource(new TextEncoder().encode('new deleted generation')));await other.batchFiles(async()=>{put(other.doc,'代次/0.md',{kind:'file',...ref});remove(other.doc,'代次/0.md');});await wait(()=>p.settings.remoteDeleteReview!==review);assert.equal(p.settings.remoteDeleteReview.approved,false);assert.equal(mem.files.size,5);
});

test('native adapter preserves generic bytes, empty files, renamed data and history copies',async t=>{const {p,mem,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);for(const name of ['data.json','data.csv','script.py','page.html','archive.zip','document.docx','empty.txt','note.md.bak.20260411-220248']){const bytes=name==='empty.txt'?new Uint8Array():new Uint8Array([0,255,128,13,10]);const f=await mem.v.createBinary(name,bytes.buffer);await p.queue;try{await wait(()=>content(other.doc,name));}catch(e){throw Error(name+': '+p.operationError+' '+JSON.stringify([...p.fileFailures])+' '+p.connectionStatus);}assert.equal(content(other.doc,name).kind,'file');assert.deepEqual(new Uint8Array(mem.data.get(name)),bytes);const versions=await p.client.request('history',{path:name});await p.restoreVersion(name,versions[0].id,'恢复副本/'+name,null);assert.deepEqual(new Uint8Array(mem.data.get('恢复副本/'+name)),bytes);if(name==='data.json'){await mem.v.rename(f,'moved/data.json');await p.queue;await p.flushPathSafety();await wait(()=>!content(other.doc,name)&&content(other.doc,f.path));assert.deepEqual(new Uint8Array(mem.data.get(f.path)),bytes);}}assert.equal(p.pendingRows().length,0);});

test('large cache reservation is linear in adapter metadata reads and reopens partial accounting',async()=>{
 const {ObsidianBlobCache}=await import('../src/v3/obsidian-cache.mjs'),m=vault(),cache=new ObsidianBlobCache(m.v.adapter);let reads=0;const read=m.v.adapter.read;m.v.adapter.read=async p=>{reads++;return read(p)};
 const refs=Array.from({length:2944},(_,i)=>({hash:i.toString(16).padStart(64,'0'),size:4096}));
 for(const ref of refs)await cache.reserve(ref);
 assert.equal(cache.metrics.quotaScans,1);assert.equal(reads,0);assert.equal(cache.quota.count,2944);assert.equal(cache.quota.bytes,2944*4096);
 const reopen=new ObsidianBlobCache(m.v.adapter);await reopen.reserve({hash:'f'.repeat(64),size:1});assert.equal(reads,2944);assert.equal(reopen.quota.bytes,2944*4096+1);
});
test('concurrent reservations charge once; uncertain state write rebuilds quota before next allocation',async()=>{
 const {ObsidianBlobCache}=await import('../src/v3/obsidian-cache.mjs'),m=vault(),cache=new ObsidianBlobCache(m.v.adapter),ref={hash:'a'.repeat(64),size:123};
 await Promise.all(Array.from({length:10},()=>cache.reserve(ref)));assert.equal(cache.quota.bytes,123);assert.equal(cache.quota.count,1);
 const write=m.v.adapter.write;let fail=true;m.v.adapter.write=async(p,s)=>{await write(p,s);if(fail){fail=false;throw Error('File system operation timed out.')}};
 const next={hash:'b'.repeat(64),size:321};await assert.rejects(cache.reserve(next),/Cache write: File system operation timed out/);await cache.reserve(next);assert.equal(cache.quota.bytes,444);assert.equal(cache.quota.count,2);
});
test('initial filesystem timeout automatically retries receive without resetting state or existing files',async t=>{
 const {p,other,mem}=await env(t);await mem.v.create('实时协作测试.md','existing synthetic');await other.putFile('资料.json',bytesSource(new TextEncoder().encode('{"synthetic":true}')));
 const write=mem.v.adapter.writeBinary;let failed=false;mem.v.adapter.writeBinary=async(path,b)=>{if(!failed&&path.startsWith('.realtime-lab-v3-cache/')){failed=true;throw Error('File system operation timed out.')}return write(path,b)};
 await p.start();await wait(()=>failed&&!p.initializing&&p.fileFailures.size>0);const id=p.client.serverId;assert(p.saved.receivePending.paths.includes('资料.json'));dueRetries(p);await p.recoverQueue();await p.queue;
 assert(mem.files.has('资料.json'));assert.equal(mem.data.get('实时协作测试.md'),'existing synthetic');assert.equal(p.client.serverId,id);assert.equal(p.fileFailures.size,0);assert.equal(p.settings.receivePending.paths.length,0);
});
test('restart resumes recorded unfinished receives but still asks about a genuine completed-file deletion',async t=>{
 const {p,other,mem}=await env(t);await other.putFile('完成.json',bytesSource(new TextEncoder().encode('done')));await other.putFile('未完成.json',bytesSource(new TextEncoder().encode('pending')));
 const write=mem.v.adapter.writeBinary;mem.v.adapter.writeBinary=async()=>{throw Error('File system operation timed out.')};await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&p.fileFailures.size>0);await p.stop();
 mem.v.adapter.writeBinary=write;const next=new bundle.default();next.app=p.app;await next.onload();next.settings=structuredClone(p.saved);next.resolveMissing=async()=>{throw Error('Unexpected direction prompt for unfinished receipt')};t.after(async()=>{await next.stop();await next.queue});await next.start();await wait(()=>mem.files.has('完成.json')&&mem.files.has('未完成.json'));await next.queue;await next.stop();
 mem.files.delete('完成.json');mem.data.delete('完成.json');const third=new bundle.default();third.app=p.app;await third.onload();third.settings=structuredClone(next.saved);let asked=false;third.resolveMissing=async paths=>{asked=true;assert.deepEqual(paths,['完成.json']);return 'cancel'};t.after(async()=>{await third.stop();await third.queue});await third.start();assert(asked);assert.equal(mem.files.has('完成.json'),false);
});
test('timeout after a completed native create is reconciled without duplicating or overwriting a subsequent local edit',async t=>{
 const {p,other,mem}=await env(t);await other.putFile('晚完成.json',bytesSource(new TextEncoder().encode('remote')));const create=mem.v.createBinary.bind(mem.v);let once=true;mem.v.createBinary=async(path,b)=>{const f=await create(path,b);if(once){once=false;throw Error('File system operation timed out.')}return f};await p.start();await wait(()=>!p.initializing&&p.fileFailures.size>0);const f=mem.files.get('晚完成.json');await mem.v.modify(f,new TextEncoder().encode('local edit').buffer);await p.queue;dueRetries(p);await p.recoverQueue();await p.queue;assert.equal(new TextDecoder().decode(mem.data.get(f.path)),'local edit');assert.equal(p.fileFailures.size,0);
});
test('filesystem timeout during first local preparation reruns preparation instead of declaring ready early',async t=>{
 const {p,other,mem}=await env(t);await mem.v.createBinary('首次本机.csv',new TextEncoder().encode('synthetic local bytes').buffer);const write=mem.v.adapter.writeBinary;let fail=true;mem.v.adapter.writeBinary=async(path,b)=>{if(fail){fail=false;throw Error('File system operation timed out.')}return write(path,b)};await p.start();await wait(()=>!!p.operationError&&!p.initializing);assert.equal(p.syncedOnce,false);dueRetries(p);await p.recoverQueue();await p.queue;assert(p.syncedOnce);assert(content(other.doc,'首次本机.csv'));assert.equal(p.operationError,'');
});

test('progress uses durable unfinished receive paths after reopen without altering state, and clears on recovery',async t=>{
 const {p,other,mem}=await env(t);await other.putFile('进度.json',bytesSource(new TextEncoder().encode('synthetic progress')));
 const write=mem.v.adapter.writeBinary;mem.v.adapter.writeBinary=async()=>{throw Error('File system operation timed out.')};
 await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&p.fileFailures.size>0);
 const before=JSON.stringify(p.settings),progress=p.progressModel();assert.equal(progress.available,true);assert.equal(progress.remaining,1);assert.equal(progress.retry,1);assert.equal(progress.completed,progress.total-1);
 assert.match(p.badgeModel().counts,/剩余 1.*待重试 1/);assert.equal(JSON.stringify(p.settings),before);
 mem.v.adapter.writeBinary=write;dueRetries(p);await p.recoverQueue();await p.queue;
 const done=p.progressModel();assert.equal(done.remaining,0);assert.equal(done.retry,0);assert.equal(done.completed,done.total);assert.equal(mem.files.has('进度.json'),true);
});

test('receive acknowledgements batch without losing the durable replay plan on crash or save failure',async t=>{
 const {p}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);const serverId=p.client.serverId,paths=Array.from({length:40},(_,i)=>'合成/'+i+'.json');
 p.settings.receivePending={serverId,paths};await p.persistConfig();p.receiptLastSaved=Date.now();let writes=0;const save=p.saveData.bind(p);p.saveData=async s=>{writes++;await save(s)};
 for(const path of paths.slice(0,7))await p.received(path);
 assert.equal(writes,0);assert.deepEqual(p.saved.receivePending.paths,paths,'crash replays conservative durable intent');assert.equal(p.pendingRows().length,33,'UI excludes only processed receipts');
 for(const path of paths.slice(7))await p.received(path);assert.equal(writes,2);assert.equal(p.saved.receivePending.paths.length,8);
 p.saveData=async()=>{throw Error('synthetic disk unavailable')};await assert.rejects(p.flushReceipts(),/disk unavailable/);assert.equal(p.settings.receivePending.paths.length,8);assert.equal(p.saved.receivePending.paths.length,8);assert.equal(p.receiveAcks.size,8);
 p.saveData=save;p.operationError='';await p.flushReceipts();assert.equal(p.saved.receivePending.paths.length,0);assert.equal(p.receiveAcks.size,0);assert.equal(p.settings.serverId,serverId);
});

test('repeated network interruption pauses after three consecutive failures while isolated file errors do not block healthy files',async t=>{
 const {p,other,mem}=await env(t);for(let i=0;i<8;i++)await other.putFile('网络恢复/'+i+'.json',bytesSource(new TextEncoder().encode('synthetic '+i)));
 const reflect=p.reflect.bind(p);let attempts=0,download;p.reflect=async()=>{p.client.serverCapabilities=p.client.serverCapabilities.filter(x=>x!=='small-blob-batch-v1');if(!download){download=p.client.blobs.download.bind(p.client.blobs);p.client.blobs.download=async()=>{attempts++;throw Error('Network load failed')}}return reflect()};
 await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&p.fileFailures.size>0);await p.queue;assert(attempts<=3,'bounded consecutive failures in a pass');assert(p.fileFailures.size<=3);assert.equal(p.settings.receivePending.paths.length,8);
 p.client.blobs.download=download;dueRetries(p);await p.recoverQueue();await p.queue;assert.equal(p.fileFailures.size,0);for(let i=0;i<8;i++)assert(mem.files.has('网络恢复/'+i+'.json'));assert.equal(p.saved.receivePending.paths.length,0);
});

test('crash snapshot with unflushed receive receipts rechecks existing files and finishes without reset or duplicate content',async t=>{
 const {p,other,mem}=await env(t);for(let i=0;i<20;i++)await other.putFile('崩溃合成/'+i+'.json',bytesSource(new TextEncoder().encode('synthetic durable '+i)));
 const received=p.received.bind(p);let count=0,crash;p.received=async path=>{await received(path);if(++count===8){p.client.flushPersist(true);assert(await p.client.persistence.wait());await p.configWrites;crash=structuredClone(p.saved);p.stopping=true;}};
 await p.start();await wait(()=>!!crash&&!p.initializing);await p.queue;assert(crash.receivePending.paths.length>20-mem.files.size,'durable checkpoint conservatively includes some already-written files');assert(p.receiveAcks.size>0);const identity=p.client.serverId;await p.stop();
 const next=new bundle.default();next.app=p.app;await next.onload();next.settings=crash;next.resolveMissing=async()=>{throw Error('Unexpected missing direction prompt')};t.after(async()=>{await next.stop();await next.queue});await next.start();await wait(()=>next.syncedOnce&&!next.initializing&&!next.pendingRows().length);await next.queue;
 assert.equal(next.client.serverId,identity);assert.equal(next.settings.receivePending.paths.length,0);assert.equal(next.fileFailures.size,0);assert.equal(mem.files.size,20);for(let i=0;i<20;i++)assert.equal(new TextDecoder().decode(mem.data.get('崩溃合成/'+i+'.json')),'synthetic durable '+i);
});

test('temporary shared blob writer contention preserves pending upload and recovers through normal backoff',async t=>{
 const {p,mem,server}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);const fetch=p.client.blobs.fetch;let blocked=false;p.client.blobs.fetch=async(u,o)=>{if(o?.method==='PUT'&&!blocked){blocked=true;return new Response('{}',{status:409})}return fetch(u,o)};
 await mem.v.createBinary('并发合成.png',new Uint8Array([19,20,21]).buffer);await wait(()=>p.fileFailures.size>0);await p.queue;assert.equal(p.client.pending.length,1);assert.equal(content(server.doc,'并发合成.png'),null);dueRetries(p);await p.recoverQueue();await p.queue;assert.equal(p.fileFailures.size,0);assert.equal(p.client.pending.length,0);assert(content(server.doc,'并发合成.png'));assert.deepEqual(new Uint8Array(mem.data.get('并发合成.png')),new Uint8Array([19,20,21]));
});

test('phase counters observe native request, cache, vault and configuration operations without recording paths',async t=>{const{p,other,mem}=await env(t);await other.putFile('计时合成.json',bytesSource(new TextEncoder().encode('synthetic measurement')));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.has('计时合成.json'));await p.queue;const perf=p.performance.snapshot();for(const k of ['network','cache','vault','config'])assert(perf[k].count>0,k);assert(!JSON.stringify(perf).includes('计时合成'));await p.reportDiagnostic();const d=await p.client.request('device-diagnostics');assert(d.devices.some(x=>x.performance?.network.count>0));});

test('connection loss during a receive does not mark every remaining file as failed',async t=>{const{p,other,mem}=await env(t);for(let i=0;i<8;i++)await other.putFile('断连计数/'+i+'.json',bytesSource(new TextEncoder().encode('synthetic '+i)));const reflect=p.reflect.bind(p);let saved,attempts=0;p.reflect=async()=>{p.client.serverCapabilities=p.client.serverCapabilities.filter(x=>x!=='small-blob-batch-v1');if(!saved){saved=p.client.blobs.download.bind(p.client.blobs);p.client.blobs.download=async()=>{attempts++;p.client.ready=false;throw Error('Connect verified V3 metadata before transferring blobs')}}return reflect()};await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&p.fileFailures.size>0);await p.queue;assert.equal(attempts,1);assert.equal(p.fileFailures.size,1);assert.equal(p.settings.receivePending.paths.length,8);p.client.ready=true;p.client.blobs.download=saved;dueRetries(p);await p.recoverQueue();await p.queue;assert.equal(p.fileFailures.size,0);assert.equal(mem.files.size,8);});


test('small-file batch prefetch overlaps blocked native vault writes and preserves receive checkpoints',async t=>{
 const {p,other,mem}=await env(t),expected=new Map();
 await other.batchFiles(async()=>{for(let i=0;i<40;i++){const data=new TextEncoder().encode('synthetic batch '+i);expected.set('批量/'+i+'.md',new TextDecoder().decode(data));await other.putFile('批量/'+i+'.md',bytesSource(data));}});
 let release,entered=false,calls=0;const gate=new Promise(r=>release=r),create=mem.v.create.bind(mem.v);t.after(()=>release?.());mem.v.create=async(path,data)=>{if(path.startsWith('批量/')&&!entered){entered=true;await gate;}return create(path,data);};
 await p.start();const batch=p.client.blobs.downloadBatch.bind(p.client.blobs);p.client.blobs.downloadBatch=async(...args)=>{calls++;return batch(...args);};
 await wait(()=>entered&&calls>=2);assert(p.settings.receivePending.paths.length>=39);release();await wait(()=>[...expected.keys()].every(k=>mem.files.has(k)));await p.queue;for(const [k,v]of expected)assert.equal(mem.data.get(k),v);assert.equal(p.settings.receivePending.paths.length,0);assert(calls<=3);assert(p.transfers.snapshot().batchRequests>0);assert.equal(p.transfers.snapshot().batchFiles,40);assert.equal(p.fileFailures.size,0);
});


test('failed batch keeps every receive intent and recovers without retyping or resetting state',async t=>{
 const {p,other,mem}=await env(t);await other.batchFiles(async()=>{for(let i=0;i<20;i++)await other.putFile('批量续传/'+i+'.md',bytesSource(new TextEncoder().encode('synthetic retry '+i)));});
 const reflect=p.reflect.bind(p);let download;p.reflect=async()=>{if(!download){download=p.client.blobs.downloadBatch.bind(p.client.blobs);p.client.blobs.downloadBatch=async()=>{throw Error('Network load failed');};}return reflect();};await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&p.fileFailures.size>0);await p.queue;assert.equal(p.settings.receivePending.paths.length,20);assert.equal(mem.files.size,0);assert(p.fileFailures.size<=3);
 p.client.blobs.downloadBatch=download;dueRetries(p);await p.recoverQueue();await p.queue;assert.equal(mem.files.size,20);assert.equal(p.settings.receivePending.paths.length,0);assert.equal(p.fileFailures.size,0);
});

test('unlock via focus or missed visibility event recovers existing edits and retained receive progress',async t=>{
 const {p,mem,server,other}=await env(t);put(other.doc,'实时协作测试.md',{kind:'text',data:'base'});await p.start();await wait(()=>p.syncedOnce&&mem.data.get('实时协作测试.md')==='base');
 const doc=p.client.doc,id=p.client.serverId,old=p.client.ws;old.send=()=>{};
 p.app.workspace.events['editor-change']({getValue:()=> 'base preserved unlock edit'},{file:mem.files.get('实时协作测试.md')});
 p.operationError='Foreground reconnect; local edits retained';p.fileFailures.set('实时协作测试.md',p.operationError);p.retryAfter=Date.now()+60000;
 p.domEvents.focus();p.domEvents.pageshow();const replacement=p.client.ws;assert.notEqual(replacement,old);assert.equal(p.lastWakeAt>0,true);
 await wait(()=>p.client.ready&&content(server.doc,'实时协作测试.md')?.data==='base preserved unlock edit');
 await p.queue;dueRetries(p);await p.recoverQueue();await p.queue;assert.equal(p.operationError,'');assert.equal(p.client.doc,doc);assert.equal(p.client.serverId,id);
 const current=p.client.ws;p.lastForegroundTick=Date.now()-60000;p.lastWakeAt=0;p.foregroundTick();assert.notEqual(p.client.ws,current);
 await wait(()=>p.client.ready);assert.equal(p.client.doc,doc);
});

test('offline receive queue retains counts without claiming fresh completion',async t=>{
 const {p,other}=await env(t);put(other.doc,'remaining.md',{kind:'text',data:'preserve'});await p.start();await wait(()=>p.syncedOnce);await p.queue;
 p.settings.receivePending={serverId:p.client.serverId,paths:['remaining.md']};p.client.ready=false;
 const progress=p.progressModel(),badge=p.badgeModel();assert.equal(progress.available,true);assert.equal(progress.remaining,1);assert.equal(progress.completed,0);assert.match(badge.counts,/上次进度.*剩余 1/);assert.notEqual(badge.tone,'confirmed');
});

test('consistency scan reads disk without changing notes, config, cache, identity or queues',async t=>{const {p,mem,other}=await env(t);put(other.doc,'合成核验.md',{kind:'text',data:'server version'});await p.start();await wait(()=>p.syncedOnce&&mem.data.get('合成核验.md')==='server version');await p.queue;await p.client.confirmUploads();mem.data.set('合成核验.md','offline disk version');const writes=mem.writes,saved=JSON.stringify(p.saved),pending=JSON.stringify(p.pendingRows()),id=p.client.serverId;const r=await p.scanConsistency();assert(r.stable);assert.equal(r.rows.find(x=>x.path==='合成核验.md').status,'different');assert.equal(mem.writes,writes);assert.equal(JSON.stringify(p.saved),saved);assert.equal(JSON.stringify(p.pendingRows()),pending);assert.equal(p.client.serverId,id);assert.equal(mem.data.get('合成核验.md'),'offline disk version');});
test('selected repair preserves local version and refuses stale or queued replacements',async t=>{const {p,mem,other}=await env(t);put(other.doc,'合成修复.md',{kind:'text',data:'remote'});await p.start();await wait(()=>p.syncedOnce&&mem.data.get('合成修复.md')==='remote');await p.queue;await p.client.confirmUploads();mem.data.set('合成修复.md','preserved local');const report=await p.scanConsistency(),row=report.rows.find(x=>x.path==='合成修复.md');assert.equal(row.status,'different');mem.data.set('合成修复.md','new edit');await assert.rejects(p.repairConsistency(row,report),/变化/);assert.equal(mem.data.get('合成修复.md'),'new edit');mem.data.set('合成修复.md','preserved local');p.dirtyFiles.set('合成修复.md',mem.files.get('合成修复.md'));await assert.rejects(p.repairConsistency(row,report),/变化/);p.dirtyFiles.delete('合成修复.md');await p.repairConsistency(row,report);assert.equal(mem.data.get('合成修复.md'),'remote');assert([...mem.data].some(([k,v])=>k.startsWith('.realtime-lab-v3-recovery/')&&v==='preserved local'));assert.equal((await p.scanConsistency()).counts.different,0);});
test('selected binary repair restores missing bytes and preserves mismatched binary original',async t=>{const {p,mem,other}=await env(t);const expected=new Uint8Array([8,9,10]);await other.putImage('合成附件.png',bytesSource(expected));await p.start();await wait(()=>p.syncedOnce&&mem.files.has('合成附件.png'));await p.queue;await p.client.confirmUploads();mem.data.set('合成附件.png',new Uint8Array([4,5,6]).buffer);const report=await p.scanConsistency(),row=report.rows.find(x=>x.path==='合成附件.png');await p.repairConsistency(row,report);assert.deepEqual(new Uint8Array(mem.data.get('合成附件.png')),expected);assert([...mem.data].some(([k,v])=>k.startsWith('.realtime-lab-v3-recovery/')&&v instanceof ArrayBuffer&&new Uint8Array(v)[0]===4));mem.data.delete('合成附件.png');mem.files.delete('合成附件.png');const missing=await p.scanConsistency(),r=missing.rows.find(x=>x.path==='合成附件.png');assert.equal(r.status,'missing');await p.repairConsistency(r,missing);assert.deepEqual(new Uint8Array(mem.data.get('合成附件.png')),expected);});

test('keep-current marker action refuses unsupported, dirty and divergent local state then preserves body and history',async t=>{
 const {p,mem,other,server}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);const f=await mem.v.create('仅解除.md','base');await p.queue;const base=content(other.doc,f.path);await mem.v.modify(f,'local branch');await p.queue;await other.putFile(f.path,bytesSource(new TextEncoder().encode('remote branch')),{base});await p.queue;await p.reflect();await p.refreshConflicts();
 const review=p.conflicts[0],expected=content(p.client.doc,f.path),history=await p.client.request('history',{path:f.path}),chosen=history.filter(v=>review.versions.includes(v.id)&&v.hash===expected.hash).at(-1),caps=p.client.serverCapabilities;
 p.client.serverCapabilities=[];await p.showConflict(review);assert(globalThis.__labModals.at(-1).contentEl.buttons.find(b=>b.text==='保留当前正文、仅解除冲突标记').disabled);await assert.rejects(p.resolveConflict(review,'keep-current-history',chosen.id,expected),/尚未支持/);p.client.serverCapabilities=caps;
 p.dirtyFiles.set(f.path,f);await assert.rejects(p.resolveConflict(review,'keep-current-history',chosen.id,expected),/待传/);p.dirtyFiles.delete(f.path);
 const body=mem.data.get(f.path);mem.data.set(f.path,'unsaved different body');await assert.rejects(p.resolveConflict(review,'keep-current-history',chosen.id,expected),/本地正文/);mem.data.set(f.path,body);
 const names=[...mem.files.keys()],state=content(server.doc,f.path),pending=JSON.stringify(p.settings.pending);await p.showConflict(review);const dialog=globalThis.__labModals.at(-1),button=dialog.contentEl.buttons.find(b=>b.text==='保留当前正文、仅解除冲突标记');assert(button&&!button.disabled);button.click();const ask=globalThis.__labModals.at(-1);assert.equal(ask.title,'仅解除冲突标记');await ask.contentEl.buttons.find(b=>b.text==='确认处理').click();assert(ask.closed&&dialog.closed);assert.equal(mem.data.get(f.path),body);assert.deepEqual([...mem.files.keys()],names);assert.deepEqual(content(server.doc,f.path),state);assert.deepEqual(await p.client.request('history',{path:f.path}),history);assert.equal(JSON.stringify(p.settings.pending),pending);assert.equal(p.conflicts.length,0);
});

test('automatic consistency fills only proven missing and absent files while preserving divergent bodies and history',async t=>{
 const {p,mem,other,server}=await env(t);await other.putFile('different.md',bytesSource(new TextEncoder().encode('server body')));await other.putFile('known-deleted.md',bytesSource(new TextEncoder().encode('present before audit')));await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;await p.client.confirmUploads();
 await p.runSafeConsistency();assert(p.settings.consistencySeen?.length);
 // Missed native file events: only synthetic maps are changed, no real vault.
 mem.data.set('different.md','local unsent body');mem.files.delete('known-deleted.md');mem.data.delete('known-deleted.md');
 const remoteWrite=p.writing;const originalReflect=p.reflect.bind(p);p.reflect=async()=>{};
 await other.putFile('never-received.png',bytesSource(new Uint8Array([4,5,6])));await p.queue;await p.client.request('barrier');await new Promise(r=>setTimeout(r,20));
 const f=new bundle.TFile('orphan.md',11);mem.files.set(f.path,f);mem.data.set(f.path,'local saved');const historyBefore=await other.request('history',{path:'different.md'});
 await p.runSafeConsistency();await p.queue;assert.equal(mem.data.get('different.md'),'local unsent body');assert(!mem.files.has('known-deleted.md'));assert(mem.files.has('never-received.png'));assert.deepEqual([...new Uint8Array(mem.data.get('never-received.png'))],[4,5,6]);assert.equal(new TextDecoder().decode(server.blobs.read(content(server.doc,'orphan.md').hash,0)),'local saved');assert.deepEqual(await other.request('history',{path:'different.md'}),historyBefore);assert.equal(p.consistencyReport.downloaded,1);assert.equal(p.consistencyReport.uploaded,1);assert.equal(p.consistencyReport.counts.different,1);assert.equal(p.consistencyReport.counts.missing,1);p.reflect=originalReflect;
});
test('safe consistency postpones existing queues and rejects scan races without clearing pending edits',async t=>{
 const {p,mem}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;await p.client.confirmUploads();p.dirtyFiles.set('pending.md',new bundle.TFile('pending.md'));const pending=JSON.stringify(p.pendingRows()),saved=JSON.stringify(p.saved);await p.runSafeConsistency();assert.match(p.consistencyStatus,/等待/);assert.equal(JSON.stringify(p.pendingRows()),pending);assert.equal(JSON.stringify(p.saved),saved);p.dirtyFiles.clear();
 await mem.v.create('race-a.md','one');await p.queue;await p.client.confirmUploads();await wait(()=>!p.reflection.queued);const read=mem.v.readBinary;let once=false;mem.v.readBinary=async f=>{if(!once){once=true;p.consistencyEpoch++;}return read(f)};await p.runSafeConsistency();assert.match(p.consistencyStatus,/暂缓/);assert.equal(p.consistencyReport.uploaded,undefined);assert.equal(mem.data.get('race-a.md'),'one');
});
test('automatic audit is opt-in, foreground only and interval bounded',async t=>{const {p}=await env(t);let runs=0;p.runSafeConsistency=async()=>runs++;p.refreshConflicts=async()=>{};p.reportDiagnostic=async()=>{};p.resumeForeground=()=>{};p.foregroundTick();assert.equal(runs,0);p.settings.autoConsistency=true;p.consistencyNextAt=Date.now()+600000;p.foregroundTick();assert.equal(runs,0);p.consistencyNextAt=0;p.foregroundTick();assert.equal(runs,1);});

test('automatic consistency preserves every real conflict candidate and divergent local body',async t=>{const {p,mem,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);const f=await mem.v.create('conflicted-audit.md','base');await p.queue;const base=content(other.doc,f.path);await mem.v.modify(f,'branch A');await p.queue;await other.putFile(f.path,bytesSource(new TextEncoder().encode('branch B')),{base});await p.queue;await p.client.confirmUploads();await wait(()=>!p.reflection.queued);const before=await other.request('history',{path:f.path}),reviews=await other.request('conflicts');mem.data.set(f.path,'preserved local draft');await p.runSafeConsistency();assert.equal(mem.data.get(f.path),'preserved local draft');assert.deepEqual(await other.request('history',{path:f.path}),before);assert.deepEqual(await other.request('conflicts'),reviews);assert.equal(p.consistencyReport.downloaded,0);assert.equal(p.consistencyReport.uploaded,0);assert(p.consistencyIssues()>0);assert.match(p.summaryStatus(),/冲突/);});

test('competing remote creation cannot overwrite a safe-upload draft, including after client restart',async t=>{
 const {p,mem,other,server}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;await p.client.confirmUploads();const f=new bundle.TFile('guarded-race.md',11);mem.files.set(f.path,f);mem.data.set(f.path,'local draft');const upload=p.client.blobs.upload.bind(p.client.blobs);let release,entered=false;const gate=new Promise(r=>release=r);t.after(()=>release?.());p.client.blobs.upload=async(...args)=>{entered=true;await gate;return upload(...args)};const checking=p.runSafeConsistency();await wait(()=>entered);await other.putFile(f.path,bytesSource(new TextEncoder().encode('remote winner')));await wait(()=>content(p.client.doc,f.path));release();await checking;await p.queue;assert.equal(mem.data.get(f.path),'local draft');assert(p.settings.consistencyHolds.includes(f.path));const h=await other.request('history',{path:f.path});assert.equal(h.length,1);assert.equal((await other.request('conflicts')).length,0);
 await p.stop();await p.queue;const next=new bundle.default();next.app=p.app;next.loadData=async()=>structuredClone(p.saved);await next.onload();t.after(async()=>{next.uiUnloaded=true;await next.stop();await next.queue;});await next.start();await wait(()=>next.syncedOnce&&!next.initializing);await next.queue;await next.client.confirmUploads();assert.equal(mem.data.get(f.path),'local draft');assert(next.pathBlocked(f.path));assert.deepEqual(await other.request('history',{path:f.path}),h);
 const report=await next.scanConsistency(),row=report.rows.find(r=>r.path===f.path);await assert.rejects(next.repairConsistency(row,report),/变化/);await next.repairConsistency(row,report,true);assert.equal(new TextDecoder().decode(mem.data.get(f.path)),'remote winner');assert(!next.pathBlocked(f.path));assert([...mem.data].some(([k,v])=>k.startsWith('.realtime-lab-v3-recovery/')&&v instanceof ArrayBuffer&&new TextDecoder().decode(v)==='local draft'));assert.deepEqual(await other.request('history',{path:f.path}),h);
});

test('lost safe-upload acknowledgement retains a durable hold then clears only on equal-byte recheck without another version',async t=>{const {p,mem,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;await p.client.confirmUploads();const f=new bundle.TFile('lost-ack.md',5);mem.files.set(f.path,f);mem.data.set(f.path,'saved');const publish=p.client.putFile.bind(p.client);p.client.putFile=async(...args)=>{await publish(...args);throw Error('synthetic lost acknowledgement')};await p.runSafeConsistency();await p.queue;assert(p.settings.consistencyHolds.includes(f.path));assert.equal(mem.data.get(f.path),'saved');const before=await other.request('history',{path:f.path});assert.equal(before.length,1);p.client.putFile=publish;await p.runSafeConsistency();assert(!p.settings.consistencyHolds.includes(f.path));assert.equal(mem.data.get(f.path),'saved');assert.deepEqual(await other.request('history',{path:f.path}),before);});

test('cache serializes overlapping staging, retains chunks and continues after failure or queued abort',async()=>{
 const {ObsidianBlobCache}=await import('../src/v3/obsidian-cache.mjs'),m=vault(),cache=new ObsidianBlobCache(m.v.adapter);let release,entered;
 const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r),a=new Uint8Array(40000).fill(31),b=new Uint8Array(70).fill(32);
 let first=true;const one=cache.stage({size:a.length,read:async(p,n)=>{if(first){first=false;entered();await gate;}return a.subarray(p,p+n)}});await started;
 const controller=new AbortController(),aborted=cache.stage(bytesSource(b),{signal:controller.signal});controller.abort();const rejected=assert.rejects(aborted,/abort/i);const two=cache.stage(bytesSource(b));release();const [ra,rb]=await Promise.all([one,two]);await rejected;
 assert.deepEqual(new Uint8Array(await cache.materialize(ra)),a);assert.deepEqual(new Uint8Array(await cache.materialize(rb)),b);const snapshot=new Map(m.data);
 const failed=cache.stage({size:1,read:async()=>{throw Error('synthetic read failure')}}),ok=cache.stage(bytesSource(b));await assert.rejects(failed,/synthetic/);assert.deepEqual(await ok,rb);assert.equal(cache.busy,false);for(const [k,v] of snapshot)assert.deepEqual(m.data.get(k),v);
});

test('legacy staging busy automatically reconciles without resetting client, retained cache or conflict history',async t=>{
 const {p,other,mem,server}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);const client=p.client,cache=p.cache,stage=cache.stage.bind(cache);let fail=true;
 cache.stage=async(...args)=>{if(fail)throw Error('Cache staging busy');return stage(...args)};
 const bytes=new Uint8Array([71,72,73]);await mem.v.createBinary('synthetic-busy.png',bytes.buffer);await wait(()=>p.dirtyFiles.has('synthetic-busy.png')&&p.fileFailures.size>0);await p.queue;
 p.operationError='Cache staging busy';fail=false;dueRetries(p);await p.recoverQueue();await p.queue;await wait(()=>content(other.doc,'synthetic-busy.png'));await client.confirmUploads();
 assert.equal(p.client,client);assert.equal(p.cache,cache);assert.equal(p.operationError,'');assert.equal(p.fileFailures.size,0);assert.equal(p.pendingRows().length,0);assert.deepEqual(new Uint8Array(mem.data.get('synthetic-busy.png')),bytes);assert.equal(p.summaryStatus(),'已提交服务器');assert(!/错误|失败|拒绝|阻止/.test(p.connectionStatus));
 p.operationError='Invalid cache reference';dueRetries(p);await p.recoverQueue();assert.equal(p.operationError,'Invalid cache reference');
});

test('remote details report actual audit result and sanitized causes, invalidate changed files and clear recovered error',async t=>{
 const {p,mem,other}=await env(t);await other.putFile('synthetic-audit.json',bytesSource(new TextEncoder().encode('synthetic')));await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;await p.runSafeConsistency();p.settings.autoConsistency=true;
 const query=async()=>{p.diagnosticLastSent=0;await p.reportDiagnostic();return (await other.request('device-diagnostics')).devices.find(d=>d.deviceId===p.settings.deviceId)};
 let row=await query();assert.equal(row.details.audit.enabled,true);assert.equal(row.details.audit.phase,'complete');assert.equal(row.details.audit.counts.equal,1);assert.equal(row.details.audit.current,true);assert(row.details.audit.checkedAt>0);
 p.operationError='Cache staging busy';row=await query();assert(row.details.reasons.includes('cache-staging-busy'));assert.equal(row.completeAtReport,false);dueRetries(p);await p.recoverQueue();await p.queue;row=await query();assert(!row.details.reasons.includes('cache-staging-busy'));
 p.operationError='private /synthetic/path secret-token';row=await query();assert(row.details.reasons.includes('unknown-error'));assert(!JSON.stringify(row).includes('secret-token'));p.operationError='';
 p.consistencyEpoch++;row=await query();assert.equal(row.details.audit.current,false);
 p.client.serverCapabilities=p.client.serverCapabilities.filter(x=>x!=='device-diagnostic-details-v1');row=await query();assert.equal(row.details,undefined);assert.equal(p.diagnosticError,'');
});

test('audit toggle saves without losing state, immediately reports, survives reload and diagnoses save failure',async t=>{
 const {p,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;const identity=p.settings.deviceId,token=p.settings.token,client=p.client,cache=p.cache;
 await p.setAutoConsistency(true);assert.equal(p.saved.autoConsistency,true);assert.equal(p.settings.deviceId,identity);assert.equal(p.settings.token,token);assert.equal(p.client,client);assert.equal(p.cache,cache);
 await wait(()=>!p.consistencyBusy);await p.setAutoConsistency(false);assert.equal(p.saved.autoConsistency,false);const row=(await other.request('device-diagnostics')).devices.find(d=>d.deviceId===identity);assert.equal(row.details.audit.enabled,false);
 const durable=structuredClone(p.saved),fresh=new bundle.default();fresh.loadData=async()=>durable;fresh.app=p.app;await fresh.onload();assert.equal(fresh.settings.autoConsistency,false);fresh.uiUnloaded=true;clearTimeout(fresh.progressTimer);
 const save=p.saveData.bind(p);p.saveData=async()=>{throw Error('synthetic persistence failure')};await p.setAutoConsistency(true);assert.equal(p.saved.autoConsistency,false);assert.match(p.operationError,/本地保存失败/);const failed=(await other.request('device-diagnostics')).devices.find(d=>d.deviceId===identity);assert(failed.details.reasons.includes('persistence'));p.saveData=save;
});

test('diagnostic throttle retains a final toggle event and overlapping reports resend the latest state',async t=>{
 const {p,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;clearTimeout(p.diagnosticTimer);p.diagnosticTimer=undefined;p.diagnosticLastSent=Date.now();p.settings.autoConsistency=true;p.scheduleDiagnostic();assert.notEqual(p.diagnosticTimer,undefined);
 await wait(()=>p.diagnosticTimer===undefined&&!p.diagnosticBusy);let row=(await other.request('device-diagnostics')).devices.find(d=>d.deviceId===p.settings.deviceId);assert.equal(row.details.audit.enabled,true);
 const request=p.client.request.bind(p.client);let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);let once=true;p.client.request=async(type,data)=>{if(type==='device-report'&&once){once=false;entered();await gate;}return request(type,data)};
 const first=p.reportDiagnostic();await started;p.settings.autoConsistency=false;await p.reportDiagnostic();assert(p.diagnosticResend);release();await first;await wait(()=>p.diagnosticTimer===undefined&&!p.diagnosticBusy);row=(await other.request('device-diagnostics')).devices.find(d=>d.deviceId===p.settings.deviceId);assert.equal(row.details.audit.enabled,false);
});

test('transfer busy during pending-upload reconnect retries automatically without dropping versions or cached bytes',async t=>{
 const {p,mem,server}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);const id=p.settings.deviceId,cache=p.cache;
 const upload=p.client.blobs.upload.bind(p.client.blobs);p.client.blobs.upload=async()=>{throw Error('Transfer busy')};await mem.v.createBinary('synthetic-pending-busy.png',new Uint8Array([34,35,36]).buffer);await wait(()=>p.client.pending.length===1);await p.queue;assert(p.dirtyFiles.has('synthetic-pending-busy.png'));
 p.client.blobs.upload=upload;await p.start();const client=p.client,real=client.blobs.upload.bind(client.blobs);let attempts=0;client.blobs.upload=async(...args)=>{if(attempts++===0)throw Error('Transfer busy');return real(...args)};
 await wait(()=>attempts>=2&&client.ready&&p.syncedOnce&&!p.initializing&&client.pending.length===0,15000);await p.queue;assert.equal(client.stopped,false);assert.equal(p.settings.deviceId,id);assert.equal(p.cache,cache);assert.equal(p.fileFailures.size,0);assert.equal(p.pendingRows().length,0);assert.deepEqual(new Uint8Array(mem.data.get('synthetic-pending-busy.png')),new Uint8Array([34,35,36]));assert(content(server.doc,'synthetic-pending-busy.png'));
});

test('path confirmation acts on only the selected group and leaves every other synthetic review unchanged',async t=>{
 const {p,other,mem}=await env(t);for(let i=0;i<5;i++)await other.putFile('synthetic-review/'+i+'.md',bytesSource(new TextEncoder().encode('retained '+i)));await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.size===5);for(const f of [...mem.files.values()])await mem.v.trash(f);await p.queue;
 const first=p.settings.pathSafety.items[0],selected=[{id:first.op.id,plan:JSON.stringify(first.op)}],others=p.settings.pathSafety.items.slice(1).map(i=>JSON.stringify(i.op));await p.confirmPathReview(selected,'approve');assert.equal(p.settings.pathSafety.items.length,5);assert.equal(p.settings.pathSafety.items[0].approved,false);
 const dialog=globalThis.__labModals.at(-1);assert.equal(dialog.title,'确认传播此组操作');dialog.contentEl.buttons.find(b=>b.text==='确认传播').click();await p.queue;assert.equal(p.settings.pathSafety.items.length,4);assert.deepEqual(p.settings.pathSafety.items.map(i=>JSON.stringify(i.op)),others);assert(p.settings.pathSafety.items.every(i=>!i.approved));assert.equal(content(other.doc,first.op.entries[0].from),null);for(const item of p.settings.pathSafety.items)assert(content(other.doc,item.op.entries[0].from));
});

test('native detail panel renders four separate status sections without treating empty queues as a completed audit',async t=>{
 const {JSDOM}=await import('jsdom'),dom=new JSDOM('<main></main>'),proto=dom.window.HTMLElement.prototype;proto.empty=function(){this.replaceChildren()};proto.createEl=function(tag,o={}){const el=dom.window.document.createElement(tag);if(o.text)el.textContent=o.text;if(o.cls)el.className=o.cls;this.append(el);return el};proto.createDiv=function(o={}){return this.createEl('div',o)};
 const {p}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);const panel=dom.window.document.querySelector('main');p.renderPanel(panel,p.summaryStatus());assert.equal(panel.querySelectorAll('.rl-sync-section').length,4);assert.deepEqual([...panel.querySelectorAll('.rl-sync-section strong')].map(e=>e.textContent),['连接','文件传输','内容核对','待确认事项']);assert.match(panel.querySelectorAll('.rl-sync-section')[2].textContent,/未开启.*尚无/);assert(!panel.querySelectorAll('.rl-sync-section')[2].textContent.includes('一致 0'));
});

test('alpha36 failed path yields to healthy files, retains same-path version order and automatically drains without typing',async t=>{
 const {p,other,server}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);const c=p.client;
 c.stopped=true;c.ws.close();await wait(()=>!c.ready);clearTimeout(c.timer);
 await c.stageFile('synthetic-fair/a.json',bytesSource(new Uint8Array([31])));await c.stageFile('synthetic-fair/a.json',bytesSource(new Uint8Array([32])));await c.stageFile('synthetic-fair/b.json',bytesSource(new Uint8Array([33])));
 const versions=c.pending.filter(x=>x.path.endsWith('a.json')).map(x=>x.version),putFile=c.putFile.bind(c);let fail=true;c.putFile=async(path,...args)=>{if(path.endsWith('a.json')&&fail)throw Error('Blob request failed (409)');return putFile(path,...args)};
 c.stopped=false;c.connect();await wait(()=>c.ready&&content(server.doc,'synthetic-fair/b.json'));assert.equal(c.pending.filter(x=>x.path.endsWith('a.json')).length,2);assert(!content(server.doc,'synthetic-fair/a.json'));assert(p.saved.retryState.items.some(r=>r.key==='upload:synthetic-fair/a.json'&&r.nextAt>Date.now()));
 fail=false;await wait(()=>c.pending.length===0&&!p.fileFailures.size);await p.queue;assert.equal(content(server.doc,'synthetic-fair/a.json').version,versions[1]);const history=await other.request('history',{path:'synthetic-fair/a.json'});for(const id of versions)assert.equal(history.filter(v=>v.version===id||v.entry?.version===id).length,1);assert.equal(p.ledger().summary().retrying,0);
});

test('alpha36 restart keeps retry deadline and queue, remote diagnostics expose sanitized stalled stage and clear after recovery',async t=>{
 const {p,mem,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);const f=await mem.v.createBinary('synthetic-retry.json',new Uint8Array([61]).buffer);await wait(()=>content(other.doc,f.path));
 p.client.stopped=true;p.client.ws.close();await wait(()=>!p.client.ready);clearTimeout(p.client.timer);await mem.v.modifyBinary(f,new Uint8Array([62]).buffer);await p.queue;await p.retryFailure('upload:'+f.path,Error('Network read timeout'));const deadline=p.saved.retryState.items[0].nextAt,pending=structuredClone(p.saved.pending);await p.stop();
 const next=new bundle.default();next.app=p.app;await next.onload();next.settings=structuredClone(p.saved);t.after(async()=>{next.uiUnloaded=true;await next.stop();await next.queue});await next.start();assert.equal(next.ledger().items.get('upload:'+f.path).nextAt,deadline);assert.deepEqual(next.settings.pending,pending);await wait(()=>next.client?.ready);
 next.lastQueueProgressAt=Date.now()-65000;next.activePhases.set(999,{kind:'cache',startedAt:Date.now()-65000});await next.reportDiagnostic();let row=(await other.request('device-diagnostics')).devices.find(d=>d.deviceId===next.settings.deviceId);assert(row.recovery.stalled);assert.equal(row.recovery.reason,'cache');assert(!JSON.stringify(row.recovery).includes('synthetic-retry'));next.activePhases.delete(999);
 await wait(()=>next.client.pending.length===0&&!next.fileFailures.size);await next.queue;await next.reportDiagnostic();row=(await other.request('device-diagnostics')).devices.find(d=>d.deviceId===next.settings.deviceId);assert(!row.recovery.stalled);assert.equal(row.recovery.retrying,0);assert.deepEqual(new Uint8Array(mem.data.get(f.path)),new Uint8Array([62]));
});

test('alpha37 desktop hidden heartbeat recovers a silent socket, retained versions and diagnostics without focus or typing',async t=>{
 const {startDesktopHeartbeat}=await import('../src/v3/desktop-heartbeat.mjs'),native=await import('node:timers');
 const {p,mem,server,other}=await env(t);p.manifest={version:'0.5.0-alpha.37'};put(other.doc,'实时协作测试.md',{kind:'text',data:'synthetic base'});await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;
 const c=p.client,doc=c.doc,id=c.serverId,device=p.settings.deviceId,old=c.ws;c.ws.send=()=>{};
 p.app.workspace.events['editor-change']({getValue:()=> 'synthetic offline preserved'},{file:mem.files.get('实时协作测试.md')});
 await c.stageFile('synthetic-background/offline.json',bytesSource(new Uint8Array([37,38,39])));const version=c.pending[0].version,ref={...c.pending[0]};
 assert.equal(p.desktopTimers.setInterval,native.setInterval);p.desktopHeartbeatStop?.();globalThis.document.hidden=true;t.after(()=>{globalThis.document.hidden=false;p.desktopHeartbeatStop?.()});
 p.desktopTimers={...native,setTimeout:(f,n)=>native.setTimeout(f,Math.min(n,50))};
 p.desktopHeartbeatStop=startDesktopHeartbeat({timers:native,intervalMs:30,tick:()=>p.backgroundTick()});
 await wait(()=>c.ws!==old&&c.ready&&content(server.doc,'实时协作测试.md')?.data==='synthetic offline preserved'&&content(server.doc,'synthetic-background/offline.json')?.version===version,5000);
 await wait(()=>!p.initializing&&c.pending.length===0&&!p.pendingRows().length,5000);await p.queue;
 let row;for(let i=0;i<80;i++){row=(await other.request('device-diagnostics')).devices.find(d=>d.deviceId===device);if(row?.fresh&&row.ready&&!row.busy&&row.queued===0&&row.matchesServer&&row.confirmedAgeMs!==null)break;await new Promise(r=>setTimeout(r,20));}
 assert(row?.fresh);assert(row.connected);assert.equal(row.foreground,false);assert.equal(row.queued,0);assert.equal(row.failed,0);assert.equal(row.conflicts,0);assert.equal(row.busy,false);assert.equal(row.matchesServer,true);assert(row.confirmedAgeMs!==null);assert.equal(c.doc,doc);assert.equal(c.serverId,id);assert.equal(p.settings.deviceId,device);assert(await p.cache.has(ref));assert.equal(mem.data.get('实时协作测试.md'),'synthetic offline preserved');
 const receivedAt=row.receivedAt;await wait(()=>Date.now()>receivedAt+60);await p.backgroundTick();row=(await other.request('device-diagnostics')).devices.find(d=>d.deviceId===device);assert(row.receivedAt>receivedAt);assert.equal(row.foreground,false);
});

test('alpha37 hidden heartbeat cannot undo explicit stop or authentication/identity safeguards',async t=>{
 const {p}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);globalThis.document.hidden=true;t.after(()=>{globalThis.document.hidden=false});let probes=0;const c=p.client;c.checkConnection=async()=>{probes++;return true};
 for(const key of ['stopping','uiUnloaded']){p[key]=true;await p.backgroundTick();p[key]=false;}for(const key of ['stopped','transportBlocked','terminalCloseCode']){c[key]=true;await p.backgroundTick();c[key]=false;}assert.equal(probes,0);
});

test('alpha37 isolated server restart drains hidden desktop queue and retains history without foreground events',async t=>{
 const {startDesktopHeartbeat}=await import('../src/v3/desktop-heartbeat.mjs'),native=await import('node:timers');
 const {p,mem,server,other,dir,token}=await env(t);await other.putFile('synthetic-background/history.json',bytesSource(new Uint8Array([1])));await other.putFile('synthetic-background/history.json',bytesSource(new Uint8Array([2])));await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;
 const c=p.client,id=c.serverId,doc=c.doc;await server.close();server.close=async()=>{};await wait(()=>!c.ready);
 await c.stageFile('synthetic-background/after-restart.json',bytesSource(new Uint8Array([37,4])));const version=c.pending[0].version;
 globalThis.document.hidden=true;p.desktopHeartbeatStop?.();p.desktopHeartbeatStop=startDesktopHeartbeat({timers:native,intervalMs:30,tick:()=>p.backgroundTick()});t.after(()=>{globalThis.document.hidden=false;p.desktopHeartbeatStop?.()});
 const next=await createVaultServerV3({dir,token,port:server.port});server.close=()=>next.close();assert.equal(next.serverId,id);
 await wait(()=>c.ready&&!p.initializing&&c.pending.length===0&&content(next.doc,'synthetic-background/after-restart.json')?.version===version,7000);await p.queue;await p.backgroundTick();
 const history=await c.request('history',{path:'synthetic-background/history.json'});assert(history.length>=2);assert.equal(c.doc,doc);assert.equal(c.serverId,id);assert.equal(p.pendingRows().length,0);assert.equal(p.fileFailures.size,0);assert.deepEqual(new Uint8Array(mem.data.get('synthetic-background/history.json')),new Uint8Array([2]));
});

test('cached resume stale error clears only after confirmation without clearing queues or conflicts',async t=>{
 const {p}=await env(t);await p.start();await wait(()=>p.client?.ready&&p.syncedOnce);await p.queue;
 p.operationError='Connect before resuming cached uploads';p.retryAfter=0;await p.recoverQueue();await p.queue;
 assert.equal(p.operationError,'');assert.equal(p.client.pending.length,0);
 p.operationError='Invalid cached upload configuration';p.retryAfter=0;await p.recoverQueue();await p.queue;
 assert.equal(p.operationError,'Invalid cached upload configuration');
});
test('queued retry rechecks connection before running cached upload recovery',async t=>{
 const {p}=await env(t);await p.start();await wait(()=>p.client?.ready&&p.syncedOnce);await p.queue;
 let release;const gate=new Promise(r=>release=r);t.after(()=>release?.());p.enqueue(()=>gate);
 let called=0;const original=p.flushLocalFiles.bind(p);p.flushLocalFiles=async()=>{called++;return original()};
 await p.retryQueue(false);p.client.ready=false;release();await p.queue;assert.equal(called,0);assert.equal(p.operationError,'');
});
test('cached resume error remains visible until a fresh server confirmation succeeds',async t=>{
 const {p}=await env(t);await p.start();await wait(()=>p.client?.ready&&p.syncedOnce);await p.queue;
 const confirm=p.client.confirmUploads.bind(p.client);p.client.confirmUploads=async()=>false;
 p.operationError='Connect before resuming cached uploads';await p.retryQueue(false);await p.queue;assert.equal(p.operationError,'Connect before resuming cached uploads');
 p.client.confirmUploads=confirm;await p.retryQueue(false);await p.queue;assert.equal(p.operationError,'');
});

test('settings retained across reload routes to the active instance without saving stale queues',async t=>{
 const {p,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;
 const old=new bundle.default();old.app=p.app;old.settings={...p.settings,autoConsistency:false,pending:{items:[{synthetic:'stale'}]}};old.uiUnloaded=true;let staleWrites=0;old.saveData=async()=>staleWrites++;p.app.plugins.plugins={'realtime-lab-v3-files':p};
 const queue=structuredClone(p.settings.pending),cache=p.cache,client=p.client;await old.setAutoConsistency(true);await wait(()=>!p.consistencyBusy);assert.equal(staleWrites,0);assert.equal(p.saved.autoConsistency,true);assert.equal(p.settings.autoConsistency,true);assert.deepEqual(p.settings.pending,queue);assert.equal(p.cache,cache);assert.equal(p.client,client);await p.reportDiagnostic();const row=(await other.request('device-diagnostics')).devices.find(d=>d.deviceId===p.settings.deviceId);assert.equal(row.details.audit.enabled,true);
});
test('external settings callback imports only the audit preference for the same local identity',async t=>{
 const {p}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;const before=structuredClone(p.settings),client=p.client,cache=p.cache;let runs=0;p.runSafeConsistency=async()=>runs++;
 p.loadData=async()=>({...before,autoConsistency:true,state:'STALE SYNTHETIC STATE',pending:{items:[]},outbox:['stale']});await p.onExternalSettingsChange();assert.equal(p.settings.autoConsistency,true);assert.equal(runs,1);const {autoConsistency:ignored,...actual}=p.settings;const {autoConsistency:prior,...expected}=before;assert.deepEqual(actual,expected);assert.equal(p.client,client);assert.equal(p.cache,cache);
 p.loadData=async()=>({...before,autoConsistency:false,deviceId:'other-device'});await p.onExternalSettingsChange();assert.equal(p.settings.autoConsistency,true);
});
test('own popout foreground is observed while another vault popout cannot enable auditing',async t=>{
 const {p}=await env(t);const doc=globalThis.document,hidden=Object.getOwnPropertyDescriptor(doc,'hidden'),old=window.activeDocument;
 Object.defineProperty(doc,'hidden',{value:true,configurable:true});t.after(()=>{if(hidden)Object.defineProperty(doc,'hidden',hidden);else delete doc.hidden;window.activeDocument=old;});
 window.activeDocument={hidden:false,defaultView:{app:p.app}};assert(p.isForeground());p.settings.autoConsistency=true;p.consistencyNextAt=0;let runs=0;p.runSafeConsistency=async()=>runs++;p.resumeForeground=()=>{};p.reportDiagnostic=async()=>{};p.refreshConflicts=async()=>{};p.foregroundTick();assert.equal(runs,1);
 window.activeDocument={hidden:false,defaultView:{app:{}}};assert(!p.isForeground());p.consistencyNextAt=0;p.foregroundTick();assert.equal(runs,1);
});

test('excluded file events do not invalidate an equal audit while real note changes still do',async t=>{
 const {p,mem,other}=await env(t);await other.putFile('synthetic-audit.md',bytesSource(new TextEncoder().encode('same')));await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;await wait(()=>!p.reflection.queued);p.settings.autoConsistency=true;
 const epoch=p.consistencyEpoch,read=mem.v.readBinary;let events=0;mem.v.readBinary=async f=>{if(f.path==='synthetic-audit.md'){events++;await mem.v.create('excluded-'+events+'.canvas','{}');}return read(f)};
 await p.runSafeConsistency();assert(events>=2);assert.equal(p.consistencyEpoch,epoch);assert.equal(p.consistencyPhase,'complete');assert.equal(p.consistencyReason,'none');await p.reportDiagnostic();const d=(await other.request('device-diagnostics')).devices.find(d=>d.deviceId===p.settings.deviceId);assert(d.details.audit.current);assert.equal(d.details.audit.counts.equal,1);
 p.auditMutation('synthetic-audit.md');assert.equal(p.consistencyEpoch,epoch+1);
});
test('visibility loss after a stable scan is waiting rather than changed and rechecks after foreground returns',async t=>{
 const {p}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;await wait(()=>!p.reflection.queued);let visible=true;p.isForeground=()=>visible;const scan=p.scanConsistency.bind(p);let first=true;p.scanConsistency=async()=>{const r=await scan();if(first){first=false;visible=false;}return r};
 await p.runSafeConsistency();assert.equal(p.consistencyReport.stable,true);assert.equal(p.consistencyPhase,'waiting');assert.notEqual(p.consistencyReason,'changed');assert(p.consistencyStatus.includes('前台'));assert(p.consistencyNextAt-Date.now()<=60000);
 visible=true;await p.runSafeConsistency();assert.equal(p.consistencyPhase,'complete');assert.equal(p.consistencyReason,'none');
});
test('genuine content mutation defers safely and converges on a bounded retry without writing bodies',async t=>{
 const {p,mem,other}=await env(t);await other.putFile('synthetic-stable.md',bytesSource(new TextEncoder().encode('preserved')));await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;await wait(()=>!p.reflection.queued);const read=mem.v.readBinary;let once=true;mem.v.readBinary=async f=>{if(once){once=false;p.auditMutation(f.path);}return read(f)};const before=mem.data.get('synthetic-stable.md'),history=await other.request('history',{path:'synthetic-stable.md'});
 await p.runSafeConsistency();assert.equal(p.consistencyPhase,'deferred');assert.equal(p.consistencyReason,'changed');assert(p.consistencyNextAt-Date.now()<=30000);
 await p.runSafeConsistency();assert.equal(p.consistencyPhase,'complete');assert.equal(mem.data.get('synthetic-stable.md'),before);assert.deepEqual(await other.request('history',{path:'synthetic-stable.md'}),history);assert.equal(p.client.pending.length,0);
});
test('stable audit interrupted by temporary queue activity reports queue wait then converges',async t=>{
 const {p}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;await wait(()=>!p.reflection.queued);const scan=p.scanConsistency.bind(p);let once=true;p.scanConsistency=async()=>{const r=await scan();if(once){once=false;p.localOperations++;}return r};
 await p.runSafeConsistency();assert.equal(p.consistencyReport.stable,true);assert.equal(p.consistencyPhase,'waiting');assert.equal(p.consistencyReason,'queue-active');assert(p.consistencyNextAt-Date.now()<=60000);
 p.localOperations--;await p.runSafeConsistency();assert.equal(p.consistencyPhase,'complete');assert.equal(p.consistencyReason,'none');
});

test('historical replay drains only after confirmation and retains local recovery bytes without another conflict',async t=>{
 const {p,mem,other}=await env(t),name='synthetic-stale-body.md',old='synthetic historical body',latest='synthetic historical body\nnew additional content';await other.putFile(name,bytesSource(new TextEncoder().encode(old)),{base:null});const base=content(other.doc,name);await other.putFile(name,bytesSource(new TextEncoder().encode(latest)),{base});await p.start();await wait(()=>p.syncedOnce&&!p.initializing&&mem.files.has(name));await p.queue;await wait(()=>!p.reflection.queued);const history=await other.request('history',{path:name});
 mem.data.set(name,old);mem.files.get(name).stat.size=old.length;p.fingerprints.delete(name);await p.client.stageFile(name,bytesSource(new TextEncoder().encode(old)),{base:null});assert.equal(p.client.pending.length,1);await p.client.flushPending();await p.client.confirmUploads();await p.reflect();await p.queue;assert.equal(p.client.pending.length,0);assert.equal(p.saved.pending.items.length,0);assert.equal(mem.data.get(name),latest);assert.deepEqual(await other.request('history',{path:name}),history);assert.deepEqual(await other.request('conflicts'),[]);assert([...mem.data].some(([n,v])=>n.startsWith('.realtime-lab-v3-recovery/')&&(typeof v==='string'?v:new TextDecoder().decode(v))===old));
});

test('desktop native watchdog recovers foreground silent disconnection without browser ticks or input',async t=>{
 const native=await import('node:timers');const {p,mem,server,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;
 const c=p.client,doc=c.doc,old=c.ws;p.desktopHeartbeatStop?.();globalThis.document.hidden=false;
 c.ws.send=()=>{};await c.stageFile('synthetic-foreground/pending.json',bytesSource(new Uint8Array([42,43])));const version=c.pending[0].version;
 p.desktopTimers={...native,setTimeout:(f,n)=>native.setTimeout(f,Math.min(n,40))};
 await p.backgroundTick();await wait(()=>c.ws!==old&&c.ready);await p.backgroundTick();
 await wait(()=>!p.initializing&&c.pending.length===0&&content(server.doc,'synthetic-foreground/pending.json')?.version===version,5000);await p.queue;await p.backgroundTick();
 const row=(await other.request('device-diagnostics')).devices.find(d=>d.deviceId===p.settings.deviceId);assert(row.connected&&row.fresh);assert.equal(row.queued,0);assert.equal(row.failed,0);assert.equal(row.foreground,true);assert.equal(c.doc,doc);
});

test('new remote path snapshot atomically retains receive intent before reflection can start',async t=>{
 const {p,mem,other}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;
 const original=p.reflect.bind(p);let release,entered=false;const gate=new Promise(r=>release=r);p.reflect=async()=>{entered=true;await gate;return original();};t.after(()=>release?.());
 await other.putFile('synthetic-receive/new.md',bytesSource(new TextEncoder().encode('durable new remote body')));await wait(()=>entered&&content(p.client.doc,'synthetic-receive/new.md'));p.client.flushPersist(true);assert(await p.client.persistence.wait());
 assert(p.saved.receivePending.paths.includes('synthetic-receive/new.md'));assert(!mem.files.has('synthetic-receive/new.md'));release();await p.reflection.idle?.();
});

test('foreground and native heartbeat cannot bypass missing-file startup confirmation',async t=>{
 const {p,mem}=await env(t);await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;const f=await mem.v.create('synthetic-confirm.md','preserved original');await p.queue;await p.stop();mem.files.delete(f.path);mem.data.delete(f.path);
 let decide,asked=false;p.resolveMissing=async()=>{asked=true;return await new Promise(r=>decide=r);};t.after(()=>decide?.('cancel'));const starting=p.start();await wait(()=>asked);const c=p.client;assert(!c.ws);p.resumeForeground(true);await p.backgroundTick();assert(!c.ws,'no handshake before explicit recovery direction');decide('restore');await starting;await wait(()=>c.ready&&p.syncedOnce);assert.equal(c.serverId,p.settings.serverId);
});

test('audit timeout and disconnect report a concrete cause, retain data and retry to a fresh complete result',async t=>{
 const {diagnosticDetails}=await import('../src/v3/diagnostic-details.mjs');
 const {p,mem,other,server}=await env(t);await other.putFile('合成核对.md',bytesSource(new TextEncoder().encode('正文必须保留')));await p.start();await wait(()=>p.syncedOnce&&!p.initializing);await p.queue;await p.client.confirmUploads();await p.runSafeConsistency();assert.equal(p.consistencyPhase,'complete');
 const scan=p.scanConsistency.bind(p),persist=p.persistConfig.bind(p),data=structuredClone([...mem.data]),history=JSON.stringify(await other.request('history',{path:'合成核对.md'})),pending=JSON.stringify(p.client.pending),plans=JSON.stringify(p.settings.pathSafety);
 for(const scenario of [{stage:'scan',error:'Not connected',n:1,code:'network-transient'},{stage:'verify',error:'Request timeout',n:2,code:'network-transient'},{stage:'save-baseline',error:'synthetic disk unavailable',code:'persistence'}]){
  let calls=0;p.scanConsistency=async()=>{if(++calls===scenario.n)throw Error(scenario.error);return scan()};p.persistConfig=async()=>{if(scenario.stage==='save-baseline')throw Error(scenario.error);return persist()};
  const started=Date.now();await p.runSafeConsistency();let detail=diagnosticDetails(p);assert.equal(detail.audit.phase,'deferred');assert.equal(detail.audit.current,false);assert(detail.reasons.includes(scenario.code));assert(p.consistencyStatus.includes(scenario.stage));assert(p.consistencyNextAt>started);assert(p.consistencyNextAt<Date.now()+61000);assert.equal(p.consistencyBusy,false);
  assert.deepEqual([...mem.data],data);assert.equal(JSON.stringify(await other.request('history',{path:'合成核对.md'})),history);assert.equal(JSON.stringify(p.client.pending),pending);assert.equal(JSON.stringify(p.settings.pathSafety),plans);
  p.scanConsistency=scan;p.persistConfig=persist;p.settings.autoConsistency=true;p.consistencyNextAt=0;p.foregroundTick();await wait(()=>!p.consistencyBusy&&p.consistencyPhase==='complete');detail=diagnosticDetails(p);assert.equal(detail.audit.current,true);assert.equal(detail.audit.reason,'none');assert.equal(detail.audit.counts.equal,1);assert.equal(p.consistencyError,'');assert(!detail.reasons.includes(scenario.code));
 }
});
