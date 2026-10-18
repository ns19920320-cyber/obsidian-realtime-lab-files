import test from 'node:test';
import assert from 'node:assert/strict';
import * as Y from 'yjs';
import {changedPaths,queueRows,fileProgress} from '../src/v3/sync-progress.mjs';
import {put} from '../src/v3/model.mjs';
test('queue metadata detects inline edits and reference changes without storing file content',()=>{
 const doc=new Y.Doc(),seen=[];doc.on('afterTransaction',t=>seen.push(...changedPaths(doc,t)));
 put(doc,'实时协作测试.md',{kind:'text',data:'a'});doc.getText('text:实时协作测试.md').insert(1,'b');assert(seen.includes('实时协作测试.md'));doc.destroy();
});
test('queue view deduplicates path and prioritizes retry failure over awaiting confirmation',()=>{
 const rows=queueRows({metadata:['a.md','b.md'],files:[{path:'a.md',size:3}],dirty:['a.md'],failures:[['a.md','retry']],downloads:['c.pdf']});assert.equal(rows.length,3);assert.deepEqual(rows.find(r=>r.path==='a.md'),{path:'a.md',state:'失败，可重试',error:'retry'});
});

test('file progress separates remaining paths, active requests and retries without double counting',()=>{
 const p=fileProgress({known:['a','b','c'],pending:['b','c','c'],failures:['c'],active:1,ready:true});
 assert.deepEqual(p,{available:true,total:3,completed:1,remaining:2,retry:1,active:1});
 assert.equal(fileProgress({known:['a'],pending:['*'],ready:true}).available,false);
 assert.equal(fileProgress({known:['a'],ready:false}).available,false);
 assert.equal(fileProgress({known:['a'],pending:['new'],failures:['new'],ready:true}).total,2);
 assert.equal(fileProgress({known:['a'],ready:true}).completed,1);
});
test('foreground transport cancellation retries but identity and disk failures remain protected',async()=>{const {recoverableSyncFailure}=await import('../src/v3/retry-policy.mjs');assert.equal(recoverableSyncFailure('Foreground reconnect; local edits retained'),true);assert.equal(recoverableSyncFailure('401 authentication failure'),false);assert.equal(recoverableSyncFailure('Local snapshot save failed; outbox retained'),false);});
