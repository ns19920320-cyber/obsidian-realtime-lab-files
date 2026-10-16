# Realtime Lab Files 0.5.0-alpha.19

BRAT: ns19920320-cyber/obsidian-realtime-lab-files. Isolated initialized Realtime-Lab-V3-Files- vaults only.

## Faster first receive
Receive completion checkpoints are coalesced at 16 files or on the next completion after one second, and flushed at reconciliation completion, normal stop and background notification. Durable receive intent is still saved BEFORE creating files; a crash before completion checkpointing conservatively rechecks existing files by content rather than treating them as deletions or losing unfinished work. Background delivery is best-effort on iOS, so recovery never depends on the notification running. Uploads, identity, metadata snapshots and path-protection approvals keep their existing persistence rules.

Non-empty downloads omit the redundant blob-status request because the server exposes only committed content at the GET endpoint. Server identity is still checked for EVERY file before transfer. Empty blobs still check status. Two 32 KiB data frames are prefetched at most; cache writes remain ordered and full hash verification remains mandatory. Uploads and native file mutations remain serialized within each client. Redundant cache directory existence checks were removed after reservation establishes the directory. No file-size, history or quota limits are weakened.

Three consecutive recognized transport failures pause a receive pass for normal bounded backoff; an isolated file failure does not block healthy files. Temporary blob writer-busy HTTP 409 is retryable with its durable upload queue retained; version-publication conflicts are not blindly retried. The completed / remaining / retry header introduced in alpha.18 is retained.

## Personal-device concurrency
Five devices do not require a distributed job system. Basic concurrent editing/version-conflict protection remains essential and is retained. The two-frame download window reduces request latency within one device; it does not permit concurrent overwrites of local files. Five simultaneous attachment receivers were verified against the real local server with synthetic files.

## Validation and performance limits
233 automated tests, typecheck and build passed. Tests include ordered bounded prefetch, abort/resume, a later frame failing first, empty blobs, checkpoint save failure, crash snapshots containing unflushed receipts, five receivers, and temporary writer contention. Existing synthetic content was preserved.

Synthetic transport benchmark (25 ms/request, 3 ms/cache write): 40 small files took 3327 ms before and 2249 ms after (120 to 80 requests); one 1 MiB attachment took 1033 ms before and 532 ms after. Isolated plugin/loopback benchmark with an emulated Obsidian adapter and 10 ms/config save: 120 files took 1613 ms before and 240 ms after, with 124 to 13 config saves, including final metadata persistence. These are controlled synthetic benchmarks, NOT measured iPhone speedups or comparisons against LiveSync. Physical-device alpha.19 performance acceptance remains pending.

## Safe update
Update the existing isolated rehearsal vault through BRAT. Preserve notes, connection settings, server/device identity, cache, history, pending uploads and receive state. No initialization, endpoint/token change, server upgrade or protocol change is required from alpha.18. Requires versioned-files-v1 and general-files-v1 on an alpha.16+ server; the old alpha.15 service is incompatible. Never enable LiveSync in the same rehearsal vault. This is not approval to migrate production.

## Source
source.zip contains allowlisted source, tests and build files only. Notes, settings, credentials, snapshots, private benchmark results and node_modules are excluded. Build: npm ci; npm run typecheck; node --test --test-concurrency=1 test/*.test.mjs; npm run build:v3-files.

Source commit: d14d12bf6af5f1e1d6c261a74bbf3ce69273df5c
