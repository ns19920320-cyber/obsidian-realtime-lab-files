# Realtime Lab Files 0.5.0-alpha.4

Experimental sync for isolated `Realtime-Lab-V3-Files-` test vaults only. Do not use on production notes or alongside another sync plugin.

## Install with BRAT

Repository: `ns19920320-cyber/obsidian-realtime-lab-files`. Choose `0.5.0-alpha.4`, or follow the latest version including pre-releases. No GitHub token needed.

Existing alpha.2/alpha.3 test users: update in place. Keep your files, settings, offline snapshot, server URL and token. Do not initialize again, reset state or retype pending edits. After loading the update, saved inline edits are reconciled before upload; a local recovery copy is retained when disk differs from its snapshot.

## Fixes

- On foreground resume replace stale WebSockets even when the old socket still reports OPEN. Keep the same live Y.Doc, verified identity, local snapshot and pending blobs.
- Check authenticated application round trips every 10 seconds while visible; a failed 15-second request replaces the transport. Explicit stop and capacity/security pauses are respected.
- Show live connection status on the mobile settings page; do not announce file readiness after a connection has dropped.
- Retain alpha.3 public editor-change fallback.

150 automated tests passed, including stale OPEN sockets, foreground recovery without retyping, disk-only unsent text on update and watchdog recovery. Type checking passed. Physical iPhone validation of alpha.4 is pending; the reproduced code defects have not conclusively established the cause of the user's earlier phone failure.

## Files and source

`main.js` and `manifest.json` are the plugin; `plugin.zip` contains only those two files. `source.zip` contains source, synthetic tests, dependency lockfile and build scripts. Extract it in a separate directory; run `npm ci`, `npm run typecheck`, `npm test`, `npm run build:v3-files`. Build output is `work/v3-files-plugin`. The historical source root manifest belongs to V2; this build explicitly uses `manifest.v3-files.json`.

Markdown, image/PDF and version history use protocol 3 with `versioned-files-v1`. Existing server data/identity/protocol are unchanged. New small `实时协作测试.md` uses inline collaboration; other Markdown uses whole-file versioning. Limits: 16 MiB Markdown, 5 MiB image/PDF, 3,000 active paths, 128 MiB active payloads. Full details in source `V3-FILES.md`.

No real notes, runtime settings, server connection details or credentials are distributed. The original `obsidian-realtime-lab` repository is unchanged.

Source commit: 35635a21f36bef9f20535d25120d255abf7f43b6
