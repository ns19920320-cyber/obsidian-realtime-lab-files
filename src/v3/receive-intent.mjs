import * as Y from 'yjs';
import {decode} from '../client.mjs';
import {entries} from './model.mjs';
// Persist intent with the first snapshot that introduces a remote path. A later
// reflection pass may never run before process exit. Previously tracked missing
// files still require explicit deletion/recovery direction.
export function newlyReceivedPaths(previous,next,isMissing){
 const before=new Y.Doc(),after=new Y.Doc();
 try{if(previous)Y.applyUpdate(before,decode(previous));Y.applyUpdate(after,decode(next));const known=before.getMap('files');return Object.keys(entries(after)).filter(p=>!known.has(p)&&isMissing(p));}
 finally{before.destroy();after.destroy();}
}
