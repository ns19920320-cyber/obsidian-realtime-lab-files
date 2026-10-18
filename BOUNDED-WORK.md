# Alpha 7: bounded client work

Client snapshots are encoded and saved together at most once per 200 ms while active; slow saves have one in-flight write and at most one replacement final snapshot. Explicit stop flushes the latest state and awaits persistence. This does not guarantee survival of operating-system termination during the pending interval.

Remote filesystem reflection is coalesced into one pending/in-flight pass and a dirty flag. Socket send backlog exceeding 32 MiB or a synchronous send exception pauses transport, retains local state and requires explicit reconnect. A single oversized frame may remain blocked: this is protection, not attachment chunking.

93 synthetic tests pass, including slow/failing persistence, final flush, reflection bursts, backlog pause/reconnect and synchronous send failure. Type checking, build and release asset privacy checks pass. No new native/iPhone acceptance is implied.

Remaining: V2 still embeds Base64 attachments in Yjs and full persisted snapshots. Prior 3 x 4 MiB synthetic workloads failed the agreed memory budget. Server candidate cloning, history copies and atomic whole-state persistence remain expensive. Do not migrate a production vault or describe alpha 7 as iPhone capacity-ready. Native installation remains alpha 4; public GitHub release remains 0.3.0.
