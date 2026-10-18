> Historical document for frozen commit 87293de. Current Files source is described in V3-FILES.md; do not use this historical build/install procedure on the Files branch.

# V3 native plugin candidate 0.5.0-alpha.1

Build: `npm run build:v3`. Native assets are ONLY
`work/v3-plugin/main.js` and `work/v3-plugin/manifest.json` (id realtime-lab-v3).
Root main.js/manifest.json remain V2; do not install them as V3.
No public publication or replacement of an installed plugin is part of the build.

New vault name MUST start `Realtime-Lab-V3-`, initialized with
`realtime-lab-v3.json` `{isolatedLab:true,protocol:3}`. V2 marker is rejected.
Settings require protocol:3 before state decoding. Misplaced old settings block
connection and all settings writes; explicit backup/reset stores a private copy
inside this new test vault's hidden recovery folder, never imports its CRDT state.
Do not package data.json, cache, recovery files, notes, tokens or test-server data.

The entry point is src/v3/plugin.ts, wired to VaultClientV3, reference-only model,
V3 marker and ObsidianBlobCache. Markdown is CRDT; images use fixed 32 KiB chunks.
For a locally changed image, vault.readBinary reads at most one image (<=5 MiB)
once, then staging/transmission uses hidden 32 KiB cache files. A file-stat/event
fingerprint avoids re-reading the original image for each remote text change.
An incoming image is downloaded into chunks then materialized once (<=5 MiB) for
Obsidian createBinary/modifyBinary. Files are processed sequentially, not all read
into memory. Cache directory is capped at 100 MiB reserved bytes/1000 hashes,
including old recovery content. No automatic cleanup that could delete pending
or sole recovery copies; reaching quota fails visibly. Metadata corruption stops
rather than guessing/resetting its offset.

The native HTTP bridge uses Obsidian requestUrl per bounded chunk, not WebView
fetch; no CORS workaround or arbitrary-origin allowance. Native requestUrl cannot
abort its current request: at most one in-flight 32 KiB request completes before
cancellation stops further work. The durable offset makes retry safe. Native API
write promises are awaited before advancing cache metadata; this is NOT a proven
OS crash/power-loss fsync guarantee on iOS. TLS and physical iPhone remain untested.

Offline images stage into private durable chunks plus a reference-only pending
manifest. Cold reopen resumes them after identity verification. A missing local
pending-only file participates in the explicit restore/delete/cancel prompt;
stale pending replay cannot resurrect a later tombstone. Text and binary backups
remain hidden and excluded from synchronization. History restoration creates new
versions and retains losing concurrent image versions.

Interface tests build the real V3 entry point with mocked Obsidian vault APIs and
the real local V3 server/software peer. They cover bidirectional text/images,
no repeated original-image reads, settings free of binary payloads, local recovery
on deletion, old state/marker refusal and explicit backup, chunk-cache reopen,
quota rejection, cold offline-image restart, pending-only deletion direction,
and native HTTP authorization/frame/abort semantics. These are adapter tests,
not evidence that the physical Obsidian/iPhone runtime already passed.

Retained restrictions: images only (PDF unsupported), single image 5 MiB,
Markdown 1 MiB, total supported content 50 MiB, tracked paths 1000, CRDT
text+metadata state 2 MiB. Known ~3000-file target and 25+ MiB Markdown corpus are
not yet supported. Increasing path count alone would not address the text budget.
No formal-vault migration has been attempted. Future whole-file fallback must be
explicit, preserve both conflicting versions and be tested before expanding scope.
