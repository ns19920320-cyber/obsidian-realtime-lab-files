// Streamed file content is separate from the strictly bounded CRDT state.
export const MAX_PATHS=8192,MAX_ACTIVE_PATHS=6000,MAX_INLINE_NOTE=16*1024,MAX_INLINE_TOTAL=128*1024;
export const MAX_BINARY=5*1024*1024,MAX_FILE_TEXT=16*1024*1024;
export const MAX_BLOB_BYTES=MAX_FILE_TEXT,MAX_LIVE_BYTES=256*1024*1024,MAX_STATE=8*1024*1024;
export const FILE_REFS_CAPABILITY='versioned-files-v1';
export const MAX_DISK_BYTES=2*1024*1024*1024,MAX_DISK_OBJECTS=8192;

export const BLOB_RESPONSE_IDENTITY_CAPABILITY='blob-response-identity-v1';

// Includes base64 expansion and bounded JSON envelopes; file-body quotas are unchanged.
export const METADATA_CAPACITY_CAPABILITY="metadata-capacity-8m-v1";
export const MAX_METADATA_WIRE=16*1024*1024,MAX_METADATA_INBOX=32*1024*1024;
export const LEGACY_METADATA_INBOX=8*1024*1024;
