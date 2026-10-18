import test from 'node:test';
import assert from 'node:assert/strict';
import * as Y from 'yjs';
import {encode,decode,LabClient} from '../src/client.mjs';
import {VaultClient} from '../src/vault-client.mjs';
const reference=Buffer;
for(const length of [0,1,2,3,8191,8192,8193,16383,16384,16385,2*1024*1024+17])test('browser codec byte equality and nonzero offset at length '+length,()=>{const storage=new Uint8Array(length+23);for(let i=0;i<storage.length;i++)storage[i]=(i*139+17)&255;const view=storage.subarray(11,11+length),expected=reference.from(view).toString('base64');assert.equal(encode(view),expected);assert.deepEqual(decode(expected),view);assert.equal(decode(expected).byteOffset,0);assert.equal(decode(expected).byteLength,length);});
test('codec runs with no global Node Buffer and rejects invalid base64',()=>{const original=globalThis.Buffer;try{globalThis.Buffer=undefined;const bytes=new Uint8Array([0,1,127,128,254,255]);assert.equal(encode(bytes),'AAF/gP7/');assert.deepEqual(decode('AAF/gP7/'),bytes);assert.throws(()=>decode('!'));assert.throws(()=>decode('a'));}finally{globalThis.Buffer=original;}});
for(const Client of [LabClient,VaultClient]){
 test(Client.name+' without onPersist does not attempt a whole-document snapshot',()=>{const c=new Client({url:'ws://127.0.0.1:1',token:'synthetic-no-network'}),store=c.doc.store;try{c.doc.store=null;assert.doesNotThrow(()=>c.doc.emit('update',[new Uint8Array([0]),'synthetic']));}finally{c.doc.store=store;c.close();c.doc.destroy();}});
 test(Client.name+' explicit persistence callback keeps complete offline snapshots',()=>{const snapshots=[],c=new Client({url:'ws://127.0.0.1:1',token:'synthetic-no-network',onPersist:s=>snapshots.push(s)});const text=c.doc.getText('test');text.insert(0,'离线中文🙂');text.insert(text.length,'继续');assert.equal(snapshots.length,2);const restored=new Y.Doc();Y.applyUpdate(restored,decode(snapshots.at(-1)));assert.equal(restored.getText('test').toString(),'离线中文🙂继续');c.close();c.doc.destroy();restored.destroy();});
}
