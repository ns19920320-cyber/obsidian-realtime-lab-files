# Realtime Lab Files 0.5.0-alpha.5

Isolated `Realtime-Lab-V3-Files-` test vaults only. Do not enable in production notes or alongside another sync plugin.

## BRAT upgrade

Repository: `ns19920320-cyber/obsidian-realtime-lab-files`. Choose `0.5.0-alpha.5` or follow newest including pre-releases. No GitHub token is needed. Update in place: keep files, local snapshots, pending blobs, existing server URL, identity and token. Do not initialize or reset again. Existing auto-connect choice is preserved.

## New in alpha.5

- Mobile-visible status panel: preparing files, pending upload/confirmation, failed paths, last authenticated server round-trip time, and auto-connect on/off. A server confirmation does not certify other devices have received the content.
- Reference-only outbox for local text/metadata. Items clear only after a server barrier and durable local snapshot; later edits cannot be cleared by earlier confirmations. Restart restores outbox together with the existing CRDT snapshot.
- Whole-file uploads first enter the durable chunk cache and pending manifest even when online. Failed paths remain visible, and the retry button resumes upload and reception. Repeated retry does not duplicate the same pending file version.
- Queue panel deduplicates paths and displays the first 50; counts are path counts, not edit counts. The panel shows files actively being received, not an estimate of all remote bytes still to download. Explicitly stopping synchronization stops tracking live events; disk changes are reconciled on the next connection.
- New create/join wizard visibly offers auto-connect, on by default for new connections. Existing choices stay unchanged. Enabling auto-connect in settings also starts the current connection. When disabled, startup explains that manual connection is required.
- Idle heartbeat confirmation does not rewrite unchanged snapshots. Existing foreground recovery and isolation protections remain.

159 automated tests, type checking and browser build passed. Native Mac and physical iPhone validation are reported separately; do not assume full-device acceptance from automated tests. No end-to-end encryption or production migration is added.

## Source and artifacts

`main.js` and `manifest.json` are BRAT assets; `plugin.zip` contains only those files. `source.zip` is the frozen source with tests and lockfile. Extract separately and run `npm ci`, `npm run typecheck`, `npm test`, `npm run build:v3-files`. Output: `work/v3-files-plugin/`. The historical source root manifest is V2; this build explicitly uses `manifest.v3-files.json`.

Protocol 3 and `versioned-files-v1` are unchanged. New small `实时协作测试.md` supports inline collaboration; other Markdown uses file versions. Limits remain 16 MiB Markdown, 5 MiB image/PDF, 3,000 active paths and 128 MiB active payloads. See source V3-FILES.md.

No real notes, runtime settings, server connection details or real credentials are included. The original obsidian-realtime-lab repository is unchanged.

Source commit: 0f50dabf254df73fb9356e8f0f7a26002d031110

Native Mac test: status panel, retry control, editor-to-server whole-file upload and queue acknowledgement verified on the isolated vault. Original phone-test note content, auto-connect choice and server identity were preserved. Physical iPhone alpha.5 acceptance remains pending.
