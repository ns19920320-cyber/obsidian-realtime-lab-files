# Realtime Lab Files 0.5.0-alpha.8

Only for isolated Realtime-Lab-V3-Files- test vaults. BRAT repository: ns19920320-cyber/obsidian-realtime-lab-files.
Update in place; do not initialize or reset. Keep existing content, URL, token, server identity and auto-connect choice.

## Changes
Replace the toolbar pill with a muted, borderless, right-aligned row beneath the toolbar, in edit and reading views: Sync: ⚡ ↑0 ↓0. This avoids the iPhone toolbar clipping the text into a circular button. Offline/error/waiting states are explicit. Tap for queue details and retry.
↑ counts paths awaiting upload or confirmation; ↓ counts currently receiving paths. Server confirmation does not mean every device has received the files. No fabricated percentage or cumulative transfer count.

161 automated tests and type checking passed. Native Mac edit/reading/detail checks passed. Physical iPhone layout remains pending.
Existing file limits and protocol are unchanged. Only the named test note (≤16 KiB) supports character collaboration; other Markdown ≤16 MiB uses whole-file versions; images/PDF ≤5 MiB. No hidden/config/recovery files synced; no production migration or end-to-end encryption.

## Source
source.zip is a frozen source archive. npm install, npm run typecheck, npm test, npm run build:v3-files. Use manifest.v3-files.json, not the legacy root manifest. Source commit: 606af22f454774bd6ab0e7c5c52a87f63de8efd5

## alpha.8 mobile placement fix
Position the mobile status line using the actual document toolbar bottom plus 4 px, aligned right, below the reading/more buttons. Render outside transformed vault containers to avoid top-of-screen placement. Hidden until a measurable toolbar is available; refresh on layout, file and resize events. Physical iPhone placement remains pending. No content or connection reset.
Source for this version: 606af22f454774bd6ab0e7c5c52a87f63de8efd5
