# Realtime Lab Files 0.5.0-alpha.9

BRAT: ns19920320-cyber/obsidian-realtime-lab-files. Only for initialized Realtime-Lab-V3-Files- isolated test vaults. Update in place: no reset, no initialization, preserve notes, cached state, pending files, token, URL and identity. Keep the existing auto-connect choice.

## Offline recovery
Reconnect drains dirty files and clears completed transient failure rows. Temporary network failures during cached attachment preparation no longer permanently stop the client. Foreground maintenance and network-online events retry recognised transport failures with backoff; permission, identity, quota and local storage errors remain actionable failures. Queue rows distinguish automatic network retry from manual handling. Keep Obsidian foreground for recovery; no iOS background guarantee.

165 automated tests and type checking passed, including previously failing reconnect/queue regression, transient cached-file handshake retry and non-transient error protection. Native Mac validation is separate from physical iPhone acceptance. alpha.8 mobile position is retained.

Protocol/limits unchanged: named collaboration note ≤16 KiB, other Markdown ≤16 MiB, images/PDF ≤5 MiB, 128 MiB active data. No production migration, hidden/config/recovery file sync or end-to-end encryption.

## Build
source.zip is a frozen source archive. npm install; npm run typecheck; npm test; npm run build:v3-files. Use manifest.v3-files.json; legacy root manifests are not this release.
Source commit: 1ea8e0c8b49421eeef08dcf256938c5caa47f7c6
