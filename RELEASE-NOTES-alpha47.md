# 0.5.0-alpha.47

- Folder and file moves explicitly reported by Obsidian now proceed as one protected operation after a durable backup. Moving more than five files no longer requires a redundant size-only confirmation. Source-version checks, occupied-target refusal, atomic application and replay receipts remain enforced.
- When the application reports separate deletion and creation instead of a move, a unique same-name, same-content server copy is identified as a possible move in the review panel. Old paths from the same folder are displayed as one group for a single review. Ambiguous copies stay manual; content similarity does not authorize deletion.
- Receivers of a folder move verify that a unique same-name, same-content copy is durably present at its new location before backing up and removing the old local path. Ambiguous, changed or unsaved destination copies continue to require review.
- Waiting for unapproved path operations no longer triggers the 60-second stalled-transfer warning. Actual queued transfers and approved operations retain stall detection.
- Existing operations, approval flags, history, cached data and pending versions are not migrated or cleared. Previously queued deletions are never approved automatically. Group confirmation still checks every original plan ID and exact plan snapshot.

No running vault or production queue is changed by publishing this release. Existing pending plans remain untouched. No server protocol update is required beyond the compatible protected-path support already present in the existing service.

Validation uses synthetic files and temporary servers, including a six-file native folder move, concurrent destination occupation with whole-group retention, ambiguous move candidates, grouped-review immutability and waiting-review versus genuine transfer stall detection. Full serial test suite, typecheck, build and asset privacy checks are required before publication.
