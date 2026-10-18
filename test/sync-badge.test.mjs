import test from 'node:test';
import assert from 'node:assert/strict';
import {badgeState} from '../src/v3/sync-badge.mjs';
test('badge never claims confirmation merely because the queue is empty',()=>{
 assert.equal(badgeState({}).tone,'offline');assert.equal(badgeState({ready:true}).tone,'waiting');
 assert.equal(badgeState({ready:true,confirmed:true,known:7}).counts,'↑0 ↓0');
 assert.equal(badgeState({ready:true,confirmed:true,uploads:2,downloads:1}).counts,'↑2 ↓1');
 assert.equal(badgeState({ready:true,confirmed:true,unknown:true}).counts,'↑? ↓0');
 assert.equal(badgeState({ready:true,confirmed:true,error:true}).tone,'error');
 assert.match(badgeState({ready:true,confirmed:true}).description,/服务器确认不等于其他设备已收到/);
});
test('protected path review is shown as waiting for confirmation, not as active sync or a green completion',()=>{const state=badgeState({ready:true,confirmed:true,protectedCount:5});assert.equal(state.tone,'waiting');assert.match(state.display,/待确认5/);});

test('recovering progress is visible instead of an ambiguous abnormal download one',()=>{
 const progress={available:true,total:3287,completed:514,remaining:2773,retry:2773,active:1};
 const s=badgeState({ready:true,error:true,retrying:true,progress});
 assert.equal(s.tone,'busy');assert.match(s.display,/恢复中/);assert.match(s.counts,/已完成 514\/3287.*剩余 2773.*待重试 2773/);
 assert.equal(badgeState({ready:true,error:true,progress}).tone,'error');
});
test('disconnected progress keeps last known counts with explicit stale label',()=>{const b=badgeState({ready:false,connecting:true,progress:{available:true,total:2944,completed:533,remaining:2411,retry:0,active:0}});assert.match(b.counts,/上次进度.*533\/2944.*2411/);assert.equal(b.tone,'busy');assert.notEqual(b.label,'已确认');});
