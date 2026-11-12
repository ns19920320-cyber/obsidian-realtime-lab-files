import * as Y from 'yjs';
import {encode,decode} from '../client.mjs';
export const DELTA_HANDSHAKE_CAPABILITY='delta-handshake-v1';
export const MAX_VECTOR_BYTES=128*1024;
export function clientVector(doc,serverId){if(!serverId)return {};const bytes=Y.encodeStateVector(doc);return bytes.length<=MAX_VECTOR_BYTES?{serverId,vector:encode(bytes)}:{};}
export function welcomeUpdate(doc,hello,serverId){
 if(!hello.capabilities?.includes(DELTA_HANDSHAKE_CAPABILITY)||hello.vector===undefined)return {mode:'full',update:Y.encodeStateAsUpdate(doc)};
 if(typeof hello.vector!=='string'||hello.vector.length>Math.ceil(MAX_VECTOR_BYTES/3)*4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(hello.vector))throw Error('Invalid bounded handshake vector');
 const vector=decode(hello.vector);if(vector.length>MAX_VECTOR_BYTES)throw Error('Handshake vector limit');const canonical=Y.encodeStateVector(Y.decodeStateVector(vector));if(canonical.length!==vector.length||canonical.some((b,i)=>b!==vector[i]))throw Error('Invalid canonical handshake vector');
 return hello.serverId===serverId?{mode:'delta',update:Y.encodeStateAsUpdate(doc,vector)}:{mode:'full',update:Y.encodeStateAsUpdate(doc)};
}
