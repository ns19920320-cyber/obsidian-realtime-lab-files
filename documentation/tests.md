# Verification map

## Existing coverage

CI requires type checking, all node:test tests, a release build and asset privacy checks before main can publish.

| Use case / rule | Expected success and deny | Evidence / status |
|---|---|---|
| Explicit export only | Ordinary startup creates no jobs; device binding rejects another socket | protected-review.test.mjs authenticated wire case; plugin-v3.test.mjs protected export case — automated integration |
| Bound scope and limits | Traversal/private/duplicate-case paths, unknown fields, mismatched IDs and changed payloads fail | protected-review.test.mjs — automated unit/integration |
| Interrupted/restarted export | Sealed job survives restart; same immutable snapshot resumes without new version publication | protected-review.test.mjs — automated integration |
| NAS before cleanup | Missing, corrupt or mismatched receipt/checksum refuses cleanup | protected-review.test.mjs; review-nas-receipt.mjs — automated unit/integration |
| Duplicate versus unique | Same-path historical match + unchanged tombstone required; unique or edited body retained | protected-review.test.mjs; plugin-v3.test.mjs — automated unit/integration |
| Preserve originals/history/queues | Recoverable trash for matched duplicates only; unrelated pending versions, cache and history unchanged | plugin-v3.test.mjs protected export case — automated integration |
| Accurate status | Local review is waiting, real failure is error; no synced label before confirmation or available completed progress | sync-badge.test.mjs, review-presentation.test.mjs — automated unit |
| Real NAS archive and restore | 276 synthetic payloads recovered and rehashed; long Chinese paths and >5 MiB PDF; 275 duplicate copies trashed, one unique retained; queue/cache/history unchanged | Guarded live synthetic drill, private operator evidence; not a CI requirement |

## Proposed tests

- Guarded live: update a real iPhone, export selected holds, verify its NAS archive and preview before confirming cleanup.
- Manual review: interrupt the iOS app during recoverable-trash persistence and confirm the retained receipt allows recovery without resetting queues.

## Gaps

- No iOS end-to-end test runner is bundled; the real device action and filesystem bridge remain live checks.
- Multi-user per-vault permissions do not exist; the shared-token trust model is explicit in permissions.md.
- NAS credential rotation and physical storage failures are operational checks, not asserted by ordinary unit tests.
