# Realtime Lab Files 0.5.0-alpha.21

BRAT: ns19920320-cyber/obsidian-realtime-lab-files. Isolated initialized Realtime-Lab-V3-Files- vaults only.

## Mobile automatic reconnection
Fixed a watchdog gap: when readiness was already false, the health check returned without recovering a transport stuck in CONNECTING, CLOSING or an incomplete welcome handshake. Foreground checks now replace a stalled transport after 30 seconds (plus the foreground check interval). Live connections use a separate barrier probe so a delayed native snapshot save cannot hold the liveness probe behind durable confirmation.

Only the transport is replaced. Existing Y.Doc, server identity, pending file references, local outbox, partial chunks, receive checkpoint and notes are retained. Authentication rejection, capacity/path rejection, identity mismatch, explicit stop and paused transport are not automatically bypassed. No endpoint, token, protocol or server data migration is needed. Timers cannot run while iOS suspends the app; recovery resumes when JavaScript runs again.

## Validation and limits
242 automated tests, typecheck and build passed. New tests cover stale CLOSING sockets, incomplete welcome recovery, independent transport probes while durable confirmation is waiting, and terminal rejection guards. Existing tests cover retained edits, durable outbox confirmation, crash recovery and file identity/hash validation. These are synthetic isolated tests; the initial physical-phone disconnect cause cannot be proven from existing numeric diagnostics. Physical iPhone acceptance requires updating the same rehearsal vault and observing fresh diagnostics. No production vault was changed.

## Safe update
Update through BRAT in the SAME isolated rehearsal vault. Do not reinitialize, clear state, change endpoint/token, or retype test notes. Keep LiveSync disabled in this rehearsal vault. An upgrade can take time to scan retained files before the first diagnostic report. Existing alpha.20 server is compatible and unchanged.

## Source
source.zip contains allowlisted source, tests and build files only. Notes, settings, credentials, runtime data, private diagnostics and node_modules are excluded. Build: npm ci; npm run typecheck; node --test --test-concurrency=1 test/*.test.mjs; npm run build:v3-files.

Source commit: dd42eb44631eb165df6dae0ce082501099d8fe78
