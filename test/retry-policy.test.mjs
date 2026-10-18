import test from 'node:test';
import assert from 'node:assert/strict';
import {transientTransferFailure as retry} from '../src/v3/retry-policy.mjs';
test('automatic retry is restricted to transient transport failures',()=>{
 for(const s of ['Failed to fetch','Network request failed','Blob request failed (503)','Identity request failed (429)','Disconnected'])assert(retry(Error(s)),s);
 for(const s of ['Identity request failed (401)','Server identity mismatch','Local snapshot save failed','quota exceeded','Invalid pending reference','Blob request failed (413)'])assert(!retry(Error(s)),s);
});
test('only the blob writer busy 409 is transient; publication conflict 409 is not retried blindly',()=>{assert(retry(Error('Blob request failed (409)')));assert(!retry(Error('Publish request failed (409)')));});
