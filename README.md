# Realtime Lab Files — 0.5.0-alpha.2

Experimental Obsidian sync plugin, for isolated test vaults only.

## BRAT installation

Add `ns19920320-cyber/obsidian-realtime-lab-files` in BRAT and select `0.5.0-alpha.2`. This public repository needs no GitHub access token.

Use a new vault whose name starts with `Realtime-Lab-V3-Files`. Initialize it in this plugin before connecting. Do not enable another synchronization tool in this vault. Enter your server URL and access token privately in plugin settings. Neither is bundled here.

## Included files

- `main.js` / `manifest.json`: exact accepted plugin build.
- `plugin.zip`: installable plugin files only.
- `source.zip`: complete frozen source snapshot at commit `39fe085520027fc02152b76cee0a0bb881b8bd1c`, with source, tests, dependency lockfile and build scripts. Extract into a separate directory; run `npm ci` then `npm run build:v3-files`. Output: `work/v3-files-plugin/`. The root manifest in that historical source snapshot belongs to V2; the Files build explicitly uses `manifest.v3-files.json`.
- `SHA256SUMS`: integrity checks.

## Scope and verification

Markdown, image and PDF sync, whole-file version history and restore. Protocol 3 with mandatory `versioned-files-v1` capability; incompatible with the old Realtime Lab plugin/server. Existing production notes are outside its allowed vault scope.

145 automated tests passed. Separate resource probes and Mac native tests covered text, images, PDF, rename/delete, conflict history restoration, reconnect and persistence. Physical iPhone and Windows acceptance remains pending. This is an alpha test release, not a production replacement for LiveSync.

New small `实时协作测试.md` uses live text collaboration. Other Markdown files use versioned whole-file sync. Limits include 16 MiB Markdown, 5 MiB image/PDF, 3,000 active paths and 128 MiB active payloads. See `V3-FILES.md` inside the source archive for details and limitations.

No vault notes, device settings, runtime databases, server URLs or real credentials are distributed. Test fixtures in the source are synthetic. This repository is separate from `ns19920320-cyber/obsidian-realtime-lab`.
