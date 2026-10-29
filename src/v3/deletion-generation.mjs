// Yjs item identifiers survive snapshots and distinguish repeated writes of true.
// Keep the wire tombstone boolean compatible with older V3 documents.
export const DELETION_GENERATION_CAPABILITY='deletion-generation-v1';
export function deletionGeneration(doc,path){
 const map=doc.getMap('deleted');
 if(!map.has(path))return null;
 const item=map._map.get(path),id=item?.id;
 if(!id||!Number.isSafeInteger(id.client)||!Number.isSafeInteger(id.clock))throw Error('Deletion generation unavailable; preserve local file');
 return `${id.client}:${id.clock}`;
}
export function validDeletionGeneration(value){return typeof value==='string'&&/^\d{1,16}:\d{1,16}$/.test(value);}
