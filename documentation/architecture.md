# Realtime Lab Files architecture

Obsidian clients persist a Yjs metadata snapshot, immutable pending-file references and chunk caches. A per-vault authenticated Node service owns metadata, bounded blob storage and version history. Ordinary Markdown and attachments use whole-file immutable versions; the inline test note additionally supports CRDT text. The existing model and storage budgets remain in force.

The protected-review flow adds explicit device snapshots, not remote file-system control. A user action collects only current consistency-hold paths and hashes actual file bytes. Missing payloads enter the existing authenticated blob staging store; a durable bounded job metadata record is separate from the current vault document. Ordinary diagnostics remain count-only. There is no automatic export on load, reconnect or receipt arrival.

A separate operator CLI streams snapshot files and relevant retained history to NAS. The service reads the fixed receipt path over the preconfigured `nas` SSH alias and independently recomputes the archive checksum. User-confirmed cleanup requires that verified receipt, a matching original snapshot, an exact same-path history version and an unchanged server deletion generation. It uses recoverable vault trash and clears only the corresponding local hold.

Known assumptions and limitations:
- The vault token grants vault-wide access, not per-user roles; exported snapshots are visible to authenticated operators of that same vault (`server.mjs`, `protected-review-store.mjs`).
- Existing NAS SSH access and operator filesystem access are trusted; the plugin never contains those credentials (`review-nas-receipt.mjs`).
- Obsidian exposes no atomic compare-and-trash transaction. Pending/dirty/path-plan guards and repeated byte checks reduce races; a simultaneous edit still has a recoverable trash copy and the verified NAS archive (`plugin.ts`).
- There are at most 32 review jobs per service and 6000 files / 1 GiB of selected content per snapshot. Job metadata is capped at 2 MiB. No automatic job pruning or cache clearing occurs.
- Actual iOS exports and user confirmations remain guarded live checks; a simulated archive does not prove a real phone has exported.

No transactional email or public/indexable pages; no emails.md or seo.md.

Related Documents: [flows](flows.md), [permissions](permissions.md), [variables](variables.md), [tests](tests.md), [cron](cron.md), [automation](automation.md), [NAS operations](../PROTECTED-REVIEW.md).
