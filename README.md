# Realtime Lab Files 0.5.0-alpha.18

BRAT: ns19920320-cyber/obsidian-realtime-lab-files. Isolated initialized Realtime-Lab-V3-Files- vaults only.

## File progress
The reading/editing header now shows completed / total files, remaining paths, and paths awaiting retry. Retry paths are included in remaining, never added twice. Active download concurrency is explained separately in the detail panel. Progress is measured in unique file paths, not bytes or HTTP requests. During initial identity/checkpoint reconciliation, progress is marked as unverified rather than displaying a false 100%. Uploads and acknowledgements are included. A cleared local queue does not prove that another device has received the files.

Recognized recoverable failures show recovery in progress while receives are actively retrying; conflicts, protected path operations and blocking errors remain visible. A failure counter is not a count of lost files. The new display reads existing queues and durable receive checkpoints without resetting them.

## Update and compatibility
Update the existing isolated rehearsal vault through BRAT. Retain notes, settings, identity, URL, token, cache, history and pending receive/upload state. No server upgrade or protocol change is required from alpha.17. Requires versioned-files-v1 and general-files-v1 (alpha.16+ server). The old alpha.15 service is incompatible. Do not enable LiveSync in the same rehearsal vault. Production migration is not approved.

## Validation
223 automated tests passed, typecheck and build passed; 52 focused tests passed after the final adjustment. Tests cover unique-path progress accounting, retry recovery to zero, unchanged saved settings during progress reads, header ownership/position, conflicts and protected operations. Layout was inspected at a 390 px content width with synthetic counters. This release has not yet been visually accepted on a physical iPhone; large mobile first-sync remains in progress. Validation uses isolated synthetic fixtures; no production notes or connection settings are changed.

## Source
source.zip contains allowlisted source/tests/build manifests only. It excludes notes, settings, tokens, runtime snapshots and node_modules. Build: npm ci; npm run typecheck; node --test --test-concurrency=1 test/*.test.mjs; npm run build:v3-files.

Source commit: 6f0da6df1145eb88d7046fdcf399cbc48eaf68c7
