# Verified Files server backups

This is a local server-side tool. It is not an Obsidian client migration, a plugin update, or automatic failover. Existing production servers, vaults, endpoints, credentials and client queues are unchanged until an operator explicitly configures it.

## What is preserved

A backup captures one atomically published `vault-v3-files.json` and every committed blob referenced by its document, immutable versions and retained history. It preserves the server ID, text, attachments, history, conflict reviews, deletion state and path-operation receipts at that point in time. Newer writes can continue while the captured version is copied because blobs are content-addressed and immutable. This assumption must be revisited before adding blob garbage collection.

Tokens, client settings, device queues, unuploaded client edits and unfinished `.part`/`.meta` uploads are not copied. Keep the existing credential securely and separately for any eventual replacement service. The snapshot contains private notes and history: store it outside repositories and cloud/public web roots. Directories use mode 0700 and files 0600. Hashes detect corruption but are not an authenticated signature against someone able to rewrite the whole backup.

## Commands

Use Node.js 22 and the project dependencies. Replace the symbolic paths below with explicit local paths. Backups must be outside the source data directory, and each server should have its own backup root and one backup job.

```sh
node scripts/server-backup.mjs create /PRIVATE/SERVER_STORE /PRIVATE/BACKUPS
node scripts/server-backup.mjs verify /PRIVATE/BACKUPS/backup-ID
node scripts/server-backup.mjs restore /PRIVATE/BACKUPS/backup-ID /PRIVATE/NEW_RESTORE_DIRECTORY
node scripts/server-backup.mjs watch /PRIVATE/SERVER_STORE /PRIVATE/BACKUPS
```

`watch` performs an immediate backup, then daily. It keeps the newest 14 verified backups, removing other verified snapshots older than 30 days; the newest always remains. Set `LAB_BACKUP_INTERVAL_MS`, `LAB_BACKUP_KEEP` and `LAB_BACKUP_MAX_AGE_DAYS` before starting to change the policy. Failed attempts retry after a minute. A 16 GiB root budget and 64 MiB free-space reserve are the API defaults; insufficient space fails without deleting existing backups. Budget tuning is available through `createServerBackup` options. Partial failed snapshots count toward the budget and remain for inspection; they are never restored or silently pruned. A root reaching its budget needs operator attention.

A new backup is verified before it is published. Retention runs only following a successful scheduled backup, verifies every deletion candidate and excludes foreign server IDs, incomplete snapshots and unknown directories. If optional retention cleanup fails, status still identifies the new successful backup and reports `retentionError`. Logs show last success, failure and private backup location; do not publish them.

## Automatic startup and abnormal-exit recovery

Run the watcher under the existing OS service supervisor. On macOS use a user LaunchAgent with `RunAtLoad=true`, `KeepAlive=true` and `ThrottleInterval=5`; use absolute Node/project/source/backup paths, a working directory and private log locations. A user LaunchAgent starts at login, not before login. The source need not be running: it only needs an already committed Files metadata snapshot. The watcher never opens a network port and never reads a token.

The isolated acceptance probe bootstraps a temporary LaunchAgent, observes a verified run, kills only that backup process, observes supervisor restart and a second verified run, then unloads the temporary job. No production LaunchAgent was installed or changed. Install a persistent job for real stores only as a separate explicit operation after checking disk capacity and destinations.

## Restore procedure

1. Verify the chosen backup. Never overwrite a live data directory. Restore to a nonexistent new directory on a private filesystem.
2. Restoration copies and checks blob bytes before atomically publishing the metadata. An in-progress marker prevents this version of the server from starting a partial restore. Failed targets are preserved for inspection; retry to a new directory rather than removing the marker.
3. Start an independent localhost-only server on a different port, explicitly supply a separately retained credential and verify its identity, files and history. Do not expose it through the production route or connect production clients during the drill.
4. Restart the restored test server and verify again. The original service/store and any newer client edits stay intact.
5. An eventual real rollback requires a coordinated plan for the other devices and their newer state; restoring an old snapshot under live clients is not automatic failover. Do not clear device queues or reinitialize vaults.

These local copies protect against accidental changes and service-store corruption. Copies on the same disk do not provide independent protection against losing that disk. Off-device/encrypted backup transport is not implemented by this tool.
