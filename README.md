# Realtime Lab Files 0.5.0-alpha.10

BRAT: ns19920320-cyber/obsidian-realtime-lab-files. Only initialized Realtime-Lab-V3-Files- isolated test vaults. Update in place; keep existing content, snapshots, pending blobs, identity, auto-connect setting, URL and token. No reset or initialization.

## Images and multiple files
Folder renames/deletions process all supported descendants. Rename keeps immutable prior versions and retains newer unsent bytes for retry. One failed attachment receive no longer blocks later files. Local dirty/pending paths are protected from remote reflection until processed. Transient network retry from alpha.9 remains.

## History
Read-only version previews: Markdown text (first 20000 characters for large whole files), common raster images, and metadata for other attachments such as PDF. Restore as a new copy without replacing the source, or explicitly replace/delete the current file after confirmation and local backup. Server rejects replacement if current content changed after preview. Expired versions and occupied copy paths fail without overwrite. Inline text preview uses the new authenticated history-preview server operation. The independent test server has been updated; an old server rejects preview safely without restoring anything.

171 automated tests and type checking passed. Native Mac and software-peer acceptance are separate from physical iPhone behavior. No iOS background execution guarantee. Keep Obsidian foreground for transfers. Existing mobile status placement retained.

Limits unchanged: collaboration note ≤16 KiB, other Markdown ≤16 MiB, images/PDF ≤5 MiB; 128 MiB active contents, 3000 active paths. Hidden/config/recovery files excluded. No production migration or end-to-end encryption.

## Build
source.zip is frozen source. npm install; npm run typecheck; npm test; npm run build:v3-files. Use manifest.v3-files.json, not legacy root manifests. Server changes are backwards compatible for older V3 clients.
Source commit: 64af6cf4f8020683176d0abbcda74befbbf2daad
