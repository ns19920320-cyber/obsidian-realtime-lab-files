# Realtime Lab Files 0.5.0-alpha.11

BRAT: ns19920320-cyber/obsidian-realtime-lab-files. Only initialized Realtime-Lab-V3-Files- isolated test vaults. Update in place without resetting content, cached snapshots, pending files, token, URL, server identity or auto-connect choice.

## Conflict review
Whole-file Markdown, images and PDF use optional conflict-review-v1 publication: compare the version an edit was based on with the server current version. Divergent branches and delete-versus-offline-edit are retained for review. Status shows a conflict count; open sync details or the conflict command/settings to review versions, preview, read a bounded text difference summary, keep every candidate as a conflict copy, or explicitly select the current version. All candidate versions become synced files under 冲突副本. Replacing the source backs up current native bytes. Server refuses stale review IDs or changed source content and resolves with one durable transaction. Replaying a publication after a lost reply is idempotent. Conflict decisions survive service restart.
Enhanced base-version detection requires alpha.11 on both devices and the updated independent server. Older V3 clients remain transfer-compatible, but their legacy writes only get best-effort conflict review via preserved losing versions. Inline collaborative notes still use CRDT automatic merge; this is not semantic conflict detection or a full manual text merge editor. Difference summaries use a bounded contiguous changed region (not a full diff) and do not execute Markdown/HTML.

## Failure verification and limits
180 tests pass with bounded test concurrency, plus type checking and build. A legacy convergence test timed out once under the fully parallel suite; its isolated rerun and the complete bounded run pass. New tests use separate synthetic subprocesses: SIGKILL after durable offline staging, SIGKILL during chunk upload (resume at 32768 bytes), and SIGKILL/restart of a separate synthetic server with conflict records preserved. These are process recovery checks, not power-loss testing or a physical iPhone force-quit acceptance. Recovery guarantees concern saved files/persisted snapshots and queues, not arbitrary unsaved keystrokes or iOS background execution. The live Mac Obsidian app was not force-quit.

Independent server data and plugin were backed up; identity, historical records and original notes/settings are retained. No production vault migration, old service/repository change, new credentials or end-to-end encryption. Existing mobile status placement and alpha.9 foreground recovery remain.
Limits unchanged: named inline collaboration note ≤16 KiB, other Markdown ≤16 MiB, images/PDF ≤5 MiB, active data ≤128 MiB/3000 paths. Conflict copies count toward these limits; expired candidate history or capacity errors refuse resolution instead of discarding data.

## Build
source.zip is frozen source. npm install; npm run typecheck; npm test (or node --test --test-concurrency=2 test/*.test.mjs); npm run build:v3-files. Use manifest.v3-files.json, not legacy root manifests.
Source commit: 8244b82f781d226bba737b22e294a977e67120ff
