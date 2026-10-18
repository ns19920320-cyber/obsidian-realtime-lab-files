> Historical document for frozen commit 10cdf06. Current Files source is described in V3-FILES.md; do not use this historical build/install procedure on the Files branch.

# Protocol 3 binary separation — source candidate 1

This is runnable Node service + portable software-client source, NOT a new
Obsidian/iPhone plugin release. `src/plugin.ts`, root `manifest.json` and built
`main.js` still implement V2. Do not distribute that bundle as V3. No installed
plugin, real notes, public route, credentials or GitHub release was changed.

## API and isolation

- `createVaultServerV3({dir,token,host:'127.0.0.1',port:0,basePath:''})`
  from `src/v3/server.mjs`. Use a NEW synthetic private directory; V2 stores
  are refused. Explicit protocol=3 and room=`realtime-lab-v3`. Both older-client
  and older-server combinations reject before state upload. Persistent serverId
  is checked by metadata connection AND authenticated HTTP identity before bytes.
- `VaultClientV3({url,token,WebSocketImpl,onIdentity,onPersist,persistDelayMs,
  state,serverId,blobCache,onPending,pending})` from `src/v3/client.mjs`.
  `connect()` then wait for `.ready`; `close()` stops transport and returns the
  final metadata persistence promise. `onIdentity` must durably save serverId and
  consumed Join mode; restored state requires matching identity/origin handling.
- `putImage(path, source, {signal,onProgress})`, source `{size,read(offset,n)}`
  returns `{hash,size}`. File bytes are read on demand, hashed incrementally and
  uploaded in fixed 32 KiB frames. A reference is published only after durable
  full upload/hash verification. No full-file Base64 conversion.
- `downloadImage(path,sink,{signal,onProgress})`, sink
  `{length(),write(offset,Uint8Array),read(offset,n),commit?(ref)}`.
  Sink length is the durable resume offset. Final entire content hash is checked
  with bounded reads; a corrupt existing prefix reports failure and requires
  discarding that partial cache before retry. It never overwrites source notes.
- `DiskBlobCache(dir)` / `fileSource(file)` from `src/v3/disk-cache.mjs` are
  Node synthetic/desktop adapters. Close fileSource explicitly. `cache.stage`,
  `cache.source(ref)` and `cache.sink(ref)` use private immutable disk sidecars.
  **An iOS durable cache and Obsidian adapter are not implemented yet.**
- Optional offline `stageImage(path,source)` needs verified server identity,
  durable blobCache and `onPending(manifest)` persistence. After reopening restore
  `{protocol:3,serverId,items}` and call `flushPending()` once connected. It
  publishes each cached immutable version, waits for a server barrier and local
  metadata persistence, then durably removes its pending reference. Retry of an
  already published version is idempotent and cannot resurrect a later tombstone.
  All pending versions are preserved (up to 1000), not just last path winner.
- `put`, `remove`, `patchText`, `content`, `entries`, `validate` from
  `src/v3/model.mjs` provide Markdown and reference-only image operations.
  `request('history',{path})`, `request('restore',{path,version})` preserve the
  previous history contract. Restore adds a new revision. Concurrent losing
  image versions remain addressable in history; blob bytes remain immutable.

## Transport, persistence and limits

HTTP GET `/v3/identity`, GET `/v3/blobs/<hash>?status=1&size=N`,
PUT `/v3/blobs/<hash>?size=N&offset=N`, GET `/v3/blobs/<hash>?offset=N`.
All require Bearer authentication. A configured `/vault-v3-test` basePath applies
to BOTH WebSocket and HTTP routes; regression tested without public exposure.
Origins default to exactly app://obsidian.md, capacitor://localhost and
http://localhost, with OPTIONS supporting Authorization/Content-Type. Unknown
origins are denied; no wildcard CORS. iOS origin/TLS/native fetch remain untested.

One active transfer per BlobTransfer; concurrent calls are rejected, not queued
with retained byte buffers. One server blob writer and at most four HTTP requests.
32 KiB upload and download response caps, incremental SHA-256 (Node oracle tested),
per-chunk fsync before ACK, atomic promotion after verified hash, directory fsync.
Restart can resume private partial files. No metadata reference to partial blobs
is accepted. Sidecars have a 100 MiB/1000-object quota including retained history
and partial reservations. No automatic blob garbage collection; quota exhaustion
fails explicitly and keeps versions rather than deleting potentially needed data.

Metadata retains CRDT state + text/history JSON, not image content. Current client
metadata send budget 4 MiB, inbox budget 8 MiB; exceeding either pauses safely for
manual reconnect with local state retained. Server outbound backlog is capped
4 MiB and metadata frame 4 MiB. V3 text/metadata state is capped 2 MiB so initial
state fits; this is an explicit current capacity restriction, not large-vault
support. Server still clones small metadata state and atomically writes whole
metadata/history. Snapshot persistence has alpha7 coalescing and final flush.

Other existing limits remain: single image 5 MiB; single Markdown 1 MiB; 1000
tracked files including tombstones; live supported content total 50 MiB. PDF and
other file formats remain unsupported. The known 1178-file/~54.5 MB reference
vault with two >1 MiB notes does NOT fit these limits. It is not migration input.
V3 has no automatic V2 migration, no production-vault migration and no claim of
physical iPhone/Windows/native Obsidian acceptance.

## Verification

`npm run typecheck`, `npm test`, `npm run build`, `npm run privacy-check`.
V3 tests cover hash boundaries, bounded reads/writes, durable upload/download
resume and server restart, immutable offline cache reopen, same-path image
conflict versions and restore, text/tombstone/history persistence, incompatible
protocol/store refusal, identity/auth checks, concurrent rejection, large-frame
rejection, receive-backlog protection, base-path routing and restricted CORS.

Small synthetic tests are NOT the 3 x 4 MiB memory acceptance run. That comparison
must retain metadata persistence on both clients, use file-backed source/sinks,
verify hashes before/after service restart and report external process RSS/CPU
under the same 192 MiB child heap / 800 MiB aggregate budget. No memory-budget
pass or mobile readiness is claimed in this source candidate.
