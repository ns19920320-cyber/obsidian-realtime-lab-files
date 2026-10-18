import {supported as legacySupported,IMAGE} from '../vault-model.mjs';
import {MAX_BINARY,MAX_FILE_TEXT} from './limits.mjs';
export const GENERAL_FILES_CAPABILITY='general-files-v1';
// Opaque migration files; never execute HTML or scripts. Hidden/config/trash
// paths retain the existing cross-platform path restrictions.
const GENERAL=/\.(json|csv|jsonl|html?|py|txt|sha256|log|zip|bak|docx)$/i;
const DATED_BACKUP=/\.md\.bak\.\d{8}-\d{6}$/i;
export const imagePath=p=>typeof p==='string'&&IMAGE.test(p);
export function supportedFile(p){return !['realtime-lab-v3-files.json','realtime-lab-v2.json'].includes(p)&&(legacySupported(p)||typeof p==='string'&&p.length<=512&&(/\.pdf$/i.test(p)||GENERAL.test(p)||DATED_BACKUP.test(p))&&legacySupported(p.replace(/\.[^./]+$/,'.png')));}
export const fileKind=p=>imagePath(p)?'image':'file';
export const maxFileSize=p=>/\.md$/i.test(p)?MAX_FILE_TEXT:imagePath(p)||/\.pdf$/i.test(p)?MAX_BINARY:MAX_FILE_TEXT;
export const textPreviewPath=p=>/\.(md|json|csv|jsonl|html?|py|txt|sha256|log|bak)$/i.test(p)||DATED_BACKUP.test(p);

export function decodeTextPreview(bytes){try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return null;}}
