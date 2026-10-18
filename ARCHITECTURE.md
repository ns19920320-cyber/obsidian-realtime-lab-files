# V2 architecture and evidence

Native plugin → authenticated WebSocket → isolated Yjs document and atomic server state/history JSON. Path metadata and deletion tombstones are separate maps. Markdown has one Y.Text per path; images are base64 metadata with immutable uploaded revision records for losing concurrent branches. Server clones current state, applies candidate, validates, persists, then applies and broadcasts. Rejected candidates do not change live or durable state.

Plugin file events use a serial queue. Remote writes are marked to prevent echo loops. Open editors bind directly to Y.Text, and their disk saves do not replay full-document replacement. Guards limit operation to explicitly marked V2 test vaults. Hidden backups and configuration do not enter the room.

Permissions: supported file read/write in the marked vault, local recovery and plugin state, configured test network endpoint. No telemetry, external account access, arbitrary server filesystem access or other-vault scanning. Shared-token access has no per-device revocation or encryption at rest.

Test map: test/vault.test.mjs covers V2 model/transport/history/durability/validation and tombstones. test/plugin-vault.test.mjs uses the actual plugin bundle with simulated Obsidian classes/events/filesystem and a real server. test/editor.test.mjs exercises real CodeMirror bindings. Other v1 tests are regression coverage, not V2 native acceptance.

Boundaries: whole-document server persistence and whole-image transfers; no resumable attachment chunks or transfer-progress UI. Retry reconciliation is Yjs state-vector based and duplicate updates are idempotent. Native crash durability, PDF/canvas/other attachments, a complete initialization wizard beyond the explicit missing-file choice and production migration remain open. No production replacement is claimed.

Native Mac mini evidence is recorded separately in NATIVE-VERIFICATION.json and the user-facing screenshot. Actual OS process-kill and physical V2 phone acceptance remain outstanding.

Alpha.2 adds server UUID + endpoint binding before cached-state upload, explicit empty Create/Join choices, nonempty initialization refusal, and current-test-vault read-only inventory. test/safety-config.test.mjs covers plan validation and inventory; V2 transport tests include rebuilt same-URL server rejection. Native alpha.1 evidence is not alpha.2 acceptance. No migration execution, no new persistent credentials, no native installation update, no alias URL approval.

Alpha.3 nonempty initialization selects read-only preview rather than marker writes. Remote differences are unknown when no existing authenticated connection is available, not guessed. inventory.diffInventory selects zero automatic writes. test/snapshot.test.mjs verifies disposable synthetic snapshot→SHA256→new-directory rollback, all ordinary attachment bytes, tamper/overlap/traversal/symlink/existing-target refusal and injected interruption/retry. The Node snapshot tool is not imported into the mobile plugin bundle. Hidden config and credentials are excluded. No production migration or current native install is touched.

Alpha.4 consumes Create only after authenticated, identity-verified welcome. Plugin persistence writes Join and identity before synchronization proceeds, and client inbox serialization keeps later update frames ordered. This is solely the CREATE_MODE_RETRY fix; existing first-create and identity guards remain. Native alpha.4 acceptance is outstanding.

Alpha.5 only adds a path-clean reproducible release packaging step and precise fail-closed identity-save guidance. The client stops retrying after that failure until explicit retry. test/vault.test.mjs covers the exact cause, recovery instruction, one connection attempt, and zero uploads. No server or capacity change. Native alpha.4 remains installed; alpha.5 is source-only.

Alpha.6 is restricted to shared browser Base64 temporary-allocation reduction and skipping unused persistence snapshots in both client classes. test/codec.test.mjs includes an intentional snapshot-access trap for omitted callbacks and functional complete-state restoration for explicit callbacks. No attachment protocol, state limit, server storage model or running native installation changes. The previous 12 MiB OOM remains a failed baseline until identical-budget remeasurement.
