# Realtime Lab Files 0.5.0-alpha.20

BRAT: ns19920320-cyber/obsidian-realtime-lab-files. Isolated initialized Realtime-Lab-V3-Files- vaults only.

## Measured bottleneck and targeted improvement
Origin-side measurements of an actual foreground mobile rehearsal found a median origin service time near 1 ms, roughly 424 ms between identity response completion and the first chunk request reaching the origin, and roughly 1503 ms per file in a segment with four chunks per file. This excludes server processing as the dominant cost and strongly indicates request-round-trip overhead. These origin observations cannot independently separate native HTTP bridge, network, cache reads and file writes on the phone. Exact phone phase attribution remains pending deployment of these counters; do not interpret these gaps as pure wire latency.

When the server advertises blob-response-identity-v1, each authenticated blob response carries the expected verified metadata server ID. The client checks EVERY data/status response before consuming it and rejects missing/mismatched identities. This eliminates the separate download identity request without disabling identity verification. Prefetch is bounded to four 32 KiB frames on supporting servers; local writes remain ordered, hashes mandatory and caches/history retained. Older servers automatically retain the alpha.19 identity request and two-frame window. Upload identity checks and durable pending uploads are unchanged.

## Numeric phase diagnostics
On servers advertising device-performance-v1, the existing authenticated device report optionally includes counts, cumulative elapsed milliseconds, maximum milliseconds, bytes and error counts for native HTTP waits, cache adapter operations, vault writes and config saves. Both summed operation time and union wall time are reported so overlapping requests are not counted as serial time. Counters are in memory since plugin startup, strictly validated and bounded; no paths, note content, URLs, error text or credentials are transmitted. Operations can overlap, so totals must not be added as if mutually exclusive. Native HTTP wait includes bridge and network time. Historical operation errors do not mean that the current retry queue remains failed. Performance telemetry is optional and does not gate old clients or old servers.

A disconnected receive pass now stops promptly instead of incorrectly marking every unattempted file as failed. Durable receive intent, saved notes, identities, queued uploads and partial chunks are retained.

## Validation
239 automated tests, typecheck and build passed. Tests cover response identity rejection before sink writes, the four-frame bound, ordered writes, abort/resume, five concurrent receivers, old diagnostic compatibility, numeric telemetry privacy validation, checkpoint save failures and crash recovery. A synthetic 25 ms/request benchmark compared alpha.19 and alpha.20: 40 small files 2267 to 1193 ms; 128 KiB attachment 95 to 45 ms; 1 MiB attachment 525 to 270 ms. These are controlled synthetic results, not physical iPhone speedup claims or LiveSync comparisons. Physical iPhone phase timings and performance acceptance are pending after update.

## Safe update
Use BRAT in the existing isolated rehearsal vault, without reinitializing, clearing state, changing endpoint/token or retyping test notes. Preserve current files, cache, history, server/device identity and pending receive/upload state. The enhanced server features are optional; base versioned-files-v1 and general-files-v1 remain required. Never enable LiveSync in the same rehearsal vault. Production migration is not approved.

## Source
source.zip contains allowlisted source, tests and build files only. Notes, settings, credentials, snapshots, runtime data, private measurement reports and node_modules are excluded. Build: npm ci; npm run typecheck; node --test --test-concurrency=1 test/*.test.mjs; npm run build:v3-files.

Source commit: 13d9f99ef8eb995c73d981ee5af0f709b40d39fe
