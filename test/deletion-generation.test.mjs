import test from 'node:test';
import assert from 'node:assert/strict';
import * as Y from 'yjs';
import {deletionGeneration,validDeletionGeneration} from '../src/v3/deletion-generation.mjs';
import {put,remove,validate} from '../src/v3/model.mjs';
test('legacy boolean deletion has a stable generation across clone and snapshot restart',()=>{
 const a=new Y.Doc();remove(a,'未命名.md');validate(a);const token=deletionGeneration(a,'未命名.md');assert(validDeletionGeneration(token));
 const b=new Y.Doc();Y.applyUpdate(b,Y.encodeStateAsUpdate(a));assert.equal(deletionGeneration(b,'未命名.md'),token);
 put(a,'未命名.md',{kind:'text',data:'new incarnation'});assert.equal(deletionGeneration(a,'未命名.md'),null);remove(a,'未命名.md');assert.notEqual(deletionGeneration(a,'未命名.md'),token);
 a.destroy();b.destroy();
});
