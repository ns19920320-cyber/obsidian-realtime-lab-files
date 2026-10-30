# 0.5.0-alpha.49

## Fixes
- Protected queued versions no longer appear as current retries or unknown file failures simply because they retain an older error record. Sync details and the document badge distinguish awaiting confirmation, protection deferral and actual failures, with path and retained-version units shown separately.
- Waiting for a decision no longer starts stalled-transfer warnings or empty automatic retry loops. Manual retry also leaves protected scheduling records unchanged. Real failures on other paths and global connection or local errors remain visible.
- Merely revisiting an awaiting plan no longer overwrites its stored error text. Bulk-review safety remains durable so approving part of a batch cannot silently propagate the remaining deletions.

## Preservation and compatibility
- Pending version IDs, payloads, approval flags, history, caches and existing retry records are retained. This is a derived display and scheduling change, not a migration or queue reset. No file is automatically restored or removed by this fix. Waiting or deferred work is never reported as fully synchronized.
- Cold restart preserves protected cached payloads without publishing or recreating missing files. Optional remote queue classifications contain counts only and require a matching server; older services retain compatible diagnostics.

Validation covers synthetic retained versions, mixed real failures, manual retry immutability, cold restart, cache retention, bulk approval safety and strict diagnostic privacy checks.
