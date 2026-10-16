# Realtime Lab Files 0.5.0-alpha.22

BRAT: ns19920320-cyber/obsidian-realtime-lab-files. Isolated initialized Realtime-Lab-V3-Files- vaults only.

## Small-file batches and download/write pipeline
When a verified server advertises small-blob-batch-v1, receive up to 16 blobs of at most 32 KiB each in one authenticated GET, with a 256 KiB total response limit. Every response must match the verified metadata server identity; every file hash and exact response length is checked before exposing any bytes to the cache. The server accepts only bounded references to committed blobs. Large files keep the existing bounded frame path. Old servers automatically use the previous per-file path.

One request ahead overlaps the next batch download with current cache and native vault writes. At most two batch payloads (512 KiB) are retained, plus existing bounded transfer/cache overhead; writes remain serial. Durable receive intent is retained until each file is actually written and checkpointed. Stopping drains pending native HTTP requests, and cached verified files can be reused after reconnect or restart. Existing pending uploads, notes, history, server/device identities, endpoint and token are preserved. Identity/authentication/hash failures are never bypassed. A local file newly marked dirty during download is not overwritten.

## Same-file controlled benchmark
The SAME 96 synthetic small files were tested against an isolated loopback server with injected 40 ms/request latency and 8 ms/native write delay. Previous single-file path: 6756 ms / 96 requests. Batch only: 2806 ms / 6 requests. Batch pipeline: 2711 ms / 6 requests. Interrupted after 21 files and reopened the same cache: all 96 files finished with matching bytes, 8 total requests and no pending files. This is a controlled synthetic comparison, NOT a physical iPhone speed claim or comparison with LiveSync. Physical iPhone acceptance follows a BRAT update in the existing rehearsal vault.

## Validation
252 automated tests, typecheck and build passed. Coverage includes bounded batches, unauthenticated rejection, wrong identity and corrupt response rejection, exact lengths, cache reuse on restart, native response limits, prefetch while native writes are blocked, durable receive checkpoints, failed batch recovery and previous single-file compatibility/recovery tests.

## Safe update
Only the isolated rehearsal backend is enhanced; existing data is backed up and checked unchanged, old clients remain compatible. Update through BRAT in the SAME isolated rehearsal vault. Do not reinitialize, clear state, change endpoint/token, or retype test notes. Keep LiveSync disabled in the rehearsal vault. Production vaults and other server routes are untouched.

## Source
source.zip contains allowlisted source, tests and build files only. Notes, settings, credentials, runtime data, private diagnostics and node_modules are excluded. Build: npm ci; npm run typecheck; node --test --test-concurrency=1 test/*.test.mjs; npm run build:v3-files.

Source commit: 2875f908b5ff34700153b3d2404637ea14b88a1a
