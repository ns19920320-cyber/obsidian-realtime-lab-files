# Files candidate 0.5.0-alpha.2 — capability versioned-files-v1

This source candidate extends the V3 alpha1 implementation; it is NOT installed,
enabled, publicly routed or published. The existing alpha1 trust dialog, its
54a8b70e4e8db829382c2ad997f588b7af7dfcbcca5a9babf2d9d2944963023b
bundle and the existing V2 service/install are unchanged. Do not enable that
alpha1 package expecting these Files features.

## Exact compatibility / artifact boundary

Build `npm run build:v3-files`. Use only `work/v3-files-plugin/main.js` and its
manifest (`id: realtime-lab-v3-files`, version 0.5.0-alpha.2). The old build:v3
command refuses to mislabel the new source as alpha1. Root manifest/main are V2.

Use a NEW `Realtime-Lab-V3-Files-*` vault and new private server directory.
Marker: `realtime-lab-v3-files.json`, `{isolatedLab:true,protocol:3,
capability:"versioned-files-v1"}`. Old V2 marker, V3 alpha1 name/marker and settings
without this capability are refused; misplaced settings have an explicit private
backup/reset action, never automatic CRDT import. Server persists
`vault-v3-files.json` with protocol and capability; old V2/V3 store directories are
refused. There is no migration or copy from a formal vault.

WebSocket room remains realtime-lab-v3, but hello AND welcome must negotiate
`capabilities:["versioned-files-v1"]`. Older clients receive no welcome/state;
new client refuses older server welcome before identity/state upload. ServerId,
state-origin checks and blob identity verification remain. New CLI default is
loopback port 17241, separate from the already prepared alpha1 service 17240.
No service at 17241 has been started by this source work.

## User-visible synchronization semantics

- Default NEW `实时协作测试.md` (<=16 KiB) uses character-level Yjs collaboration.
- Other NEW Markdown files use whole-file versions, including small Markdown.
  This is explicitly shown in Settings and one summary per connection. It is NOT
  advertised as character-level collaboration for all ordinary Markdown.
- A previously negotiated inline file can stay inline while <=16 KiB; a larger
  file moves to file-version mode. A bound editor is detached before publishing a
  file reference. An inline overflow rejected by the server retains disk/cache
  content; reconnect performs pending preparation before uploading metadata.
- Whole-file mode never tries to automatically merge simultaneous Markdown
  edits. Both immutable byte versions are retained in bounded history; user can
  restore either, creating a new revision. Losing inline changes arriving after
  a file-mode promotion are retained as conflicted text history when nonempty.
  Explicit history restore may restore a small inline version; ordinary file
  operations cannot silently switch a file back to inline mode.
- Images and PDF use the same content-addressed, resumed 32 KiB blob transport.
  PDF preview/editing is not implemented by this plugin; only byte sync/history.
- JSON, CSV and other unlisted types remain UNSUPPORTED. This is not "all files".
  Marker JSON, hidden configuration/cache/recovery files never enter sync.
  Read-only preview lists excluded/oversized files as metadata without reading
  their content. Native runtime/iPhone acceptance remains pending confirmation.

## Bounded capacity and work

3000 ACTIVE paths; 4096 TRACKED paths including tombstones, plus a 4096 tombstone
cap. This leaves headroom for rename/delete/reconnect at a 3000-file starting
point. No unbounded tombstone retention or silent reset: hitting a limit reports
an error and preserves local content.

CRDT state cap stays 2 MiB; inline per-note cap 16 KiB, aggregate 128 KiB (including
hidden text roots). Whole-file bodies NEVER enter CRDT/JSON/Base64. Single image
and PDF remain <=5 MiB; whole-file Markdown is <=16 MiB via fixed 32 KiB frames.
The larger file bound is a streamed disk-backed type limit, not an increased
in-memory message/heap budget. Native Obsidian reads/materializes one original
file at a time (up to 16 MiB for file-mode Markdown); chunk cache reads are <=32
KiB and do not re-read the original per network frame. Source handles/processes
remain bounded. Physical iOS heap/editor behavior is unverified.

Active logical content <=128 MiB. Server blob store AND client chunk cache each
reserve at most 256 MiB / 4096 hashes, including partials and retained historical
hashes. Hash deduplication can reduce physical bytes, but logical capacity is
counted per active path. Local recovery copies have their own explicit 256 MiB /
4096-file ceiling; reaching it prevents overwrite and asks for export rather than
silently deleting a sole recovery copy. History per path stays 30, history JSON
cap stays 100 MiB. There is NO automatic GC that might delete a pending or sole
recovery blob; old retained hashes can exhaust disk quota and require explicit
future maintenance. Current paths/tombstones/state/disk limits can be reached
independently and are not a guarantee of unlimited edit history.

Repeated saves coalesce to one dirty entry per path (max3000), plus one worker;
no per-event retained byte buffers/read queue. Initial join scans body files
sequentially while batching reference metadata into one bounded final CRDT diff.
Metadata/queue/backpressure limits unchanged. One connection summary replaces
per-file mode popups. History UI shows at most100 rows with path search, retaining
access to all returned history paths without creating3000 controls at once.
Empty or already applied metadata updates ACK without whole-state persistence;
real mutations retain fsync + directory-fsync before ACK. Delete-only updates are
compared by encoded state, not incorrectly treated as empty state-vector changes.

## Tests / remaining acceptance

145 automated tests pass with typecheck and distinct Files bundle build/privacy
checks. New capacity/type suite was also run with --max-old-space-size=192:
- 3000 synthetic Markdown references with persistent callbacks on BOTH clients,
  then20 rename +20 delete =>2980 active/3020 tracked; 3001 active rejected.
- Dataset bodies intentionally reuse one small blob: this checks METADATA scale,
  not3000 real payloads. Metadata stays below the unchanged2 MiB limit.
-100 immutable versions in one metadata batch, retained history<=30; one outgoing
  metadata update. No unbounded history/queue claim.
-2 MiB+7 Markdown streamed upload/download/hash verification with32 KiB reads,
  reference-only CRDT; concurrent whole-file versions and losing-version restore.
- PDF transfer/delete/restore, type/path guards, per-type oversize rejection
  before source reads; inline per-note and aggregate limits.
-72 MiB ACTIVE REFERENCE accounting allowed;128 MiB overflow refused. This is
  reference accounting, NOT72 MiB physical transfer/memory proof.
-256 MiB disk reservations hit quota before allocating bodies and preserve every
  existing reservation/version. This is quota arithmetic, NOT a full disk load.
- Native-adapter tests for whole-file MD/PDF, private backup before replacement,
 100 saves during blocked upload coalesced into<=2 original-file reads.
- Empty/repeated updates leave server write count and mtime unchanged; actual
  deletion commits and repeated deletion becomes a no-op.

The prior independent3x4 MiB ~350 MiB aggregate RSS pass applies ONLY to frozen
alpha1/source1, not automatically this candidate. The same192 MiB per-child heap /
800 MiB aggregate external RSS probe, restart/hash/idle CPU and physical native
runtime remain independent acceptance gates. No budget was raised to pass tests.
The known formal vault is NOT migrated. Its MD/image/PDF count/size now fit the
logical type caps by metadata alone, but that is not content, performance,
compatibility or full-vault acceptance; JSON/CSV remain excluded.

## Anonymous remote device diagnostics (alpha.14)
Optional `device-diagnostics-v1` adds authenticated WebSocket `device-report`
and `device-diagnostics` requests. Existing token/route and file protocol remain.
Each installation stores an opaque random device ID in its existing private
plugin configuration. Reports contain platform, plugin version, foreground/
ready/busy flags, queue category counts, confirmation age and a SHA-256 digest
of its canonical current content and deletion state (excluding GC/undo internals). No file paths, note
text, attachment bytes, user names, raw errors, credentials or IPs are reported.
Any holder of the existing vault token can query the latest status. Diagnostics
remain only in server memory, at most 64 devices; rows expire after 24 hours
and disappear on server restart. Notes/history do not depend on these records.

The client reports after status changes (throttled) and about every 10 seconds
while foreground. This is a saved-state observation, not a guarantee about
future edits, unsaved keys or iOS background execution. A query reports recent
completion only for a connected, foreground, ready and idle client with no
queued paths, receive operations, failures or conflicts; confirmation and report
age must both be at most 30 seconds and its snapshot digest must equal the
server's current material content and deletions. Later server changes, stale data and disconnection
invalidate completion. Old clients appear as unreported connections, never as
an empty known queue. A duplicated device ID on another live connection is
rejected rather than silently replacing a device. Diagnostic failure cannot
clear or modify sync queues. Version previews/notes are not modified.

Use the plugin command/settings "查看设备远程同步诊断", or query without editing:
`LAB_URL=wss://your-server/route LAB_TOKEN_FILE=/private/existing-token node scripts/device-diagnostics.mjs`.
The query viewer is excluded from the unreported connection count. Software
peers used in verification must not be described as a physical iPhone.

## Protected deletes and renames (alpha.15)
Optional `protected-paths-v1` adds authenticated `path-operation` requests. New
clients persist a server-bound operation ID, exact prepared plan and backup flag
before sending. Renames validate every source and destination before applying a
single durable update; file sources also check their immutable version IDs,
inline sources compare the captured text. Occupied destinations, stale bases,
case-only renames, schema/capacity errors reject the entire plan. Native bytes
are backed up before propagation. If content changes while an acknowledgement
is missing, it is retained and staged against the prepared rename result.

A durable receipt (up to 1024 recent operations) is saved atomically with the
metadata/history. Replaying an ID with a different plan is rejected. An expired
receipt cannot silently repeat a destructive operation: missing/stale sources
or occupied destinations require review. Local queued path plans are bounded
by 128 operations, 3000 paths and 2 MiB; they remain in private plugin settings
and do not enter public packages or device diagnostic payloads. Unsupported
servers do not trigger a fallback to raw destructive metadata edits.

Local deletion bursts are held for review at 5 files, or at 3 files covering at
least 25% of active contents; folder renames with at least 5 paths and moves out
of the supported scope also require review. Remote bulk deletions preserve
existing native files until explicit approval. Their approval is tied to the
local document's full deletion generation and expires on document change;
new operations arriving after a dialog opens are not implicitly approved.
Destinations are materialized before source deletions, with a backup and a
fresh local-state check before each trash operation. A failed incoming write
holds deletion rather than removing a source first. Backup quota failures also
hold the operation. Backups have existing 256 MiB/4096 item limits.

Use "查看删除与重命名保护" in the command palette/settings or sync details.
Confirmation still performs stale-base checks; it does not force overwrite.
Canceling propagation keeps different native bytes in visible recovery copies
when necessary and restores current server paths, instead of overwriting an
occupied remote destination. Obsidian's own automatic internal-link update
produces saved link changes; the plugin syncs those results and does not scan
and rewrite unrelated notes. Case-only renames need a distinct temporary name.
Old clients remain protocol-compatible but retain their older destructive-path
behavior; both devices must update to receive the new local protections.

Verification uses synthetic files, native-adapter integration and isolated
software processes: offline plans survive restart; a lost rename reply replays
without duplicate history/backups; interrupted file chunks resume; source
changes and destination collisions retain content; deletion-generation and
review-scope changes invalidate approval. SIGKILL checks concern durably saved
queues/snapshots in isolated subprocesses, not arbitrary unsaved keystrokes or
physical iPhone background/force-quit acceptance. No existing vault is migrated.

## Migration data files (alpha.16 isolated candidate)

Adds opaque JSON, CSV, JSONL, HTML/HTM, Python, TXT, SHA256, LOG, ZIP,
BAK and dated `.md.bak.YYYYMMDD-HHMMSS` files. General data files use
immutable `file` references, exact binary reads/writes and the existing
version/conflict/guarded rename/delete/recovery protocol. They are never
executed, unzipped or rendered as HTML. Text history previews use escaped
plain text; non-UTF8 data remains downloadable/restorable without conversion.
Markdown stays <=16 MiB, images/PDF <=5 MiB, general data <=16 MiB.

Hidden paths, `.trash`, `.obsidian`, and synchronization control markers
remain excluded. Active data allows <=256 MiB, <=6000 active /8192 tracked
paths; all are also constrained by the unchanged 2 MiB metadata budget.
Server and local caches each allow <=512 MiB/8192 objects including retained
history; each protected operation/queued-path set still caps at 3000 paths.
No unlimited mode or automatic cleanup of history is introduced.

Both server and client require `general-files-v1` as well as the previous
base capability before exchanging metadata. Alpha.15 peers cannot join the
new candidate server; alpha.16 refuses old servers before uploading state.
Existing services/vaults must not be silently upgraded or cross-connected.
The real-data rehearsal uses a new loopback-only service/data space and a
separate candidate receiver. Credentials and content are never public release
assets. This candidate does not authorize production migration.

## Alpha.17: bounded first-receive recovery candidate

Cache reservations now reconstruct private quota accounting once per cache
instance (including partial and retained objects), then serialize and account
new reservations incrementally. An I/O error invalidates this accounting;
reopen always rebuilds it. This cache is exclusively owned by the plugin;
external import or modification requires closing/reopening the cache. No
persistent counter is trusted and no existing blob is evicted.

Recognized temporary adapter failures (native filesystem timeout, EBUSY,
EAGAIN, EMFILE, ENFILE) use the existing bounded backoff. Receive reconciliation
stops at the first such failure instead of continuing a failing native queue.
Retries reconcile the actual file and verified chunks, rather than blindly
replaying a mutation whose original native action may still have completed.
Authentication, origin/identity, quota, corruption and snapshot errors remain
blocked. Cache errors now identify the adapter operation without recording
file contents or credentials, and local counters track scan and I/O work.

Before applying new remote files, a server-bound receive checkpoint is saved.
Each completed receive is removed durably. Restart resumes outstanding receive
intent; a previously completed file missing on disk still requires explicit
restore/delete direction. Existing state and completed files are not reset.
Outstanding receives appear in the pending-path panel.

Validation: unit/integration faults include timeout before/after a mutation,
quota accounting after uncertain writes, first local preparation failures,
restart during initial receive, and completed-file deletion ambiguity. The
isolated real-disk adapter rehearsal uses all 2,944 accepted real files and
SHA-256 verification. It does not stand in for native Obsidian renderer
acceptance. The precise stalled alpha.16 native operation was not logged;
quadratic quota reads and missing filesystem retry support are confirmed,
but attributing that historical native stall solely to them would be inference.
Alpha.17 remains an unpublished candidate pending native acceptance.
