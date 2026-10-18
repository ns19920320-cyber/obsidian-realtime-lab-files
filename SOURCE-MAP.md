# Source and release map

- Plugin UI and Obsidian adapter: `src/v3/plugin.ts`.
- Transport and reconnect: `src/v3/client.mjs`, `src/vault-client.mjs`.
- File storage, history and conflicts: `src/v3/server.mjs`, `model.mjs`, `blob-store.mjs`, `conflicts.mjs`, `path-safety.mjs`.
- Progress and diagnostics: `src/v3/sync-progress.mjs`, `sync-badge.mjs`, `diagnostics.mjs`.
- Native HTTP reads: `src/v3/request-fetch.mjs`.
- Tests: `test/`; native adapter integration: `test/plugin-v3.test.mjs`.
- Files manifest and build: `manifest.v3-files.json`, `build-v3-files.mjs`.

## Release checklist

1. Preserve the working tree and create a source commit before changing the version. Use an independent test server and synthetic files.
2. Update the Files manifest. Run typecheck, serial full tests, the Files build and `scripts/check-v3-release.mjs`.
3. Review only intended source changes; never use `git add .` in a workspace holding runtime data. Scan assets and the source allowlist for credentials before public upload.
4. Publish `main.js` and `manifest.json` from the same Files build, exact source, checksums and compatibility versions. Record the source commit in release notes. Download published assets and compare their hashes.
5. Do not overwrite old tags or Releases. GitHub Actions currently validates and produces a candidate artifact; publishing remains an explicit step.

Server URLs, tokens, user device identities and private vaults are runtime data outside source control. Keep independent backups of vaults and server stores; code backups do not back up notes.

## Next candidate: alpha.27

Adds local vault path / endpoint / server identity and editable local-only device names and diagnostic aliases. The consistency action hashes actual supported local bytes without changing cache, settings, notes or queues. It compares to a metadata snapshot, and flags a snapshot changed during scanning. Local-only, excluded, queued and unreadable files are listed separately.

Repair is an explicit per-file action for missing or different files. It rechecks local bytes, remote bytes, connection, pending operations, path protection, conflicts and active text bindings. A differing original is backed up before replacement; bytes are verified afterward. No bulk upload, deletion or automatic merge is performed. 275 automated tests, typecheck and Files build passed. Candidate verification uses synthetic files only. Existing production installations remain unchanged until an explicit update.
