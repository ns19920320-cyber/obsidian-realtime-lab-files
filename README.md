# Realtime Lab Files 0.5.0-alpha.17

BRAT: ns19920320-cyber/obsidian-realtime-lab-files. Isolated initialized Realtime-Lab-V3-Files- vaults only. Update without resetting notes, cache, pending uploads, snapshots, URL, token or server identity.

## Important server compatibility
Requires versioned-files-v1 AND general-files-v1 on the isolated server (alpha.16 or newer). The old alpha.15 public test service is NOT compatible. An incompatible connection is rejected before metadata exchange; do not clear state or replace the endpoint on an existing mobile vault. Use a separate empty mobile rehearsal vault for the large-vault exercise; retain the old test vault unchanged. This release does not upgrade or expose a server.

## Changes
Removes quadratic full-cache quota scans: rebuild private accounting once on open/error, then serialize and account new reservations incrementally. Partial and historical blobs remain included; no cache/history eviction. Recognized temporary filesystem errors retry through bounded backoff and reconciliation, rather than blindly repeating native mutations. Durable, server-bound receive checkpoints resume unfinished downloads after reopening; previously completed missing files still require explicit restore/delete direction. Pending paths include unfinished receives.

Includes alpha.16 opaque JSON/CSV/JSONL/HTML/Python/TXT/LOG/ZIP/backup transfer and safe plain-text previews. Files are never executed or unzipped. Active data <=256 MiB/6000 paths, tracked paths <=8192, metadata <=2 MiB, cache <=512 MiB/8192 objects; Markdown/general data <=16 MiB, images/PDF <=5 MiB. Hidden/configuration/recovery paths remain excluded. Never enable LiveSync in the same rehearsal vault.

## Validation and limits
220 serial automated tests, typecheck and build passed. A legacy 4-second convergence test exceeded its deadline under full parallel suite load; isolated and bounded full reruns passed without changing that test. Native Mac Obsidian received and verified all 2,944 real rehearsal files (119,752,446 bytes), then reopened without changing original file bytes, modification times or connection settings. 320 additional synthetic files verified; 20 unfinished attachments, including a 32 KiB partial cache, automatically completed after a scoped service pause and vault close/reopen. Final pending/failed/conflicts all zero. Production files and old rehearsal content remained unchanged.

Physical iPhone large-vault first-sync and restart acceptance is pending after this release. This does not establish iOS background execution, unsaved-keystroke durability, power-loss recovery or production migration readiness. The exact historical alpha.16 stalled native operation was not recorded; cache amplification and missing filesystem retry support are confirmed fixes, and that native timeout did not recur in this run.

## Source and build
source.zip is an allowlisted source snapshot without notes, configs, credentials, runtime data or node_modules. npm ci; npm run typecheck; node --test --test-concurrency=1 test/*.test.mjs; npm run build:v3-files. Use manifest.v3-files.json.
Source commit: f0abd5cbbe74e0eb9f008fec9134bd8fe508d717
