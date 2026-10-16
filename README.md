# Realtime Lab Files 0.5.0-alpha.23

BRAT: ns19920320-cyber/obsidian-realtime-lab-files. Isolated initialized Realtime-Lab-V3-Files- vaults only.

## Optional remote transfer counters
On servers advertising device-transfer-counters-v1, device reports now include strictly validated numeric batch request/file/byte/error counts, large-range request/byte/error counts, and ordinary chunk request/byte/error counts. Counters are in memory since plugin load. Batch file counts mean verified receive events, can include repeats, and do NOT mean unique files written to the vault. Request errors are historical totals, separate from the current retry queue. No paths, names, URLs, note text or credentials are reported. Older device reports and older servers remain compatible.

## Bounded large-file downloads
Phone alpha.22 timing showed roughly 17.4 MiB received over 100 seconds, with about 92.6 seconds of native HTTP waiting and 0.19 seconds of vault writing in that interval. This points to request overhead, not file writes, as the dominant measured cost. Native HTTP timing includes the bridge, network and response processing, not pure wire latency.

When bounded-blob-range-v1 is advertised and response identity verification is supported, large downloads request up to 256 KiB at a time, with at most two ranges in flight. The response is split into original 32 KiB cache writes, preserving existing partial-cache offsets, final hashes and ordered writes. Every response remains tied to the verified server identity. Uploads, cache format and durable queues are unchanged. Old servers fall back to the prior small-frame path. Native HTTP remains uncancellable; shutdown drains bounded in-flight work before releasing its lane.

## Same-file validation
The SAME three synthetic large files (6291505 bytes total) were compared on an isolated loopback server with 40 ms/request and 3 ms/cache-write delay. Alpha.22-sized frames: 2472 ms / 195 requests. Alpha.23 bounded ranges: 1098 ms / 27 requests. Interrupted after three original-size cache chunks and resumed at the retained 98304-byte offset: 1101 ms / 28 requests, all file bytes verified. This controlled result is NOT a physical iPhone speed claim or a LiveSync comparison.

260 automated tests, typecheck and build passed, including range bounds, original-size cache writes, identity/length rejection, preserved resume offsets, capability fallback, numeric diagnostic privacy and real-server report round trips. All previous batch, conflict, history, queue and recovery tests are retained.

## Preserve the completed rehearsal
Before this update, the phone reported all 3287 files complete with no queued receives/uploads, failures or conflicts. Only the isolated rehearsal backend is upgraded after backup, with snapshot bytes, server identity and token checked unchanged. Production notes and other routes are untouched. Update through BRAT in the SAME rehearsal vault. Do not reinitialize, clear cache/queues, change endpoint/token, or retype test notes. A completed vault may correctly show zero new transfer counters after update; files are not forced to download again merely to increase counters. Phone alpha.23 acceptance follows the update.

## Source
source.zip contains allowlisted source, tests and build files only. Notes, settings, credentials, runtime data, private diagnostics and node_modules are excluded. Build: npm ci; npm run typecheck; node --test --test-concurrency=1 test/*.test.mjs; npm run build:v3-files.

Source commit: f1ebe0dbe2469f31d43d02cb7549fcebd6e6de0b
