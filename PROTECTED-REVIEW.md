# NAS-backed protected content review

The ordinary diagnostic API intentionally contains no file paths or note content. This feature provides a separate explicit snapshot workflow for local-only protected content.

1. Configure the Finance service with `LAB_REVIEW_NAS_ROOT` pointing to an existing NAS backup directory, using the already configured `nas` SSH alias. No token/key is bundled in the release.
2. Update the phone plugin. Open sync status → 本机待核对内容 → 备份与核对 → 备份本机待核对内容. This reads only current consistency-hold files, hashes actual bytes, uploads only missing objects and seals a manifest. The current notes, Yjs document, immutable pending queue and cache are not cleared or rewritten.
3. Through the authenticated vault connection, `protected-review-list` lists bounded job IDs; `protected-review-get` with deviceId/jobId returns the explicitly exported sealed manifest. Save it privately outside the public repository.
4. Run `python3 scripts/archive-protected-review.py --snapshot <private-snapshot.json> --server-dir <private-service-directory> --nas-root <configured-root>`. It streams directly to NAS and verifies the archive. It never writes a local backup. Keep its receipt and archive; they are private.
5. `protected-review-plan` returns a preview after the service independently verifies the NAS receipt and archive checksum. Only files already deleted at the same server path and exactly matching a retained historical version are candidates. Unique, unrecognized, changed or active paths remain.
6. On the phone select 查看 NAS 核验与安全清理, review the paths/counts and explicitly confirm. Each candidate is checked again against live history and deletion generation and twice against local bytes; pending/dirty work blocks cleanup. Files move to recoverable vault trash, and only their corresponding hold is removed.

## Interruption and recovery

Until a verified receipt exists, no cleanup is permitted. A missing/partial NAS archive is not a backup. Export can be retried under the persisted immutable manifest; changed source bytes fail rather than replacing the snapshot. Job metadata survives service restart. NAS receipt verification is repeated after service restart. A changed file during cleanup remains protected. A persistence failure leaves the original NAS archive and recoverable trash; it is not handled by clearing queues or initializing the vault.

To recover, retain the archived receipt and use an independent directory to extract the specific `files/<original-path>` member. Compare its SHA256 with snapshot.json before choosing a destination; do not overwrite a live note automatically. The archive also contains relevant-history.json, server metadata and referenced historical payloads. No token or SSH key is included.

Limits: 32 jobs per service; 6000 files / 1 GiB selected content per job; 2 MiB manifest metadata; existing per-type size and server storage budgets remain. Operators must preserve or explicitly archive old job metadata before adding jobs beyond the limit; this flow never silently deletes it.
