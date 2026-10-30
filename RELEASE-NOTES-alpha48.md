# 0.5.0-alpha.48

## Improvements
- See actual content, retained storage, metadata and cache usage in sync details, with a warning at 80%. Supported remote diagnostics include sanitized capacity figures without note paths or contents.
- New servers default to 1 GiB of active content and 2 GiB of retained storage. Private client caches default to 2 GiB. Metadata capacity increases to 8 MiB with matching bounded transport windows. No history or cache is pruned to make room.

## Fixes
- Recognized capacity failures no longer appear as unknown errors. Their original queued versions can resume after capacity is available, without changing version IDs or payloads.
- Capacity recovery does not publish versions blocked by unapproved path plans. Explicitly approved path operations retain their existing behavior. Unknown, authentication and identity failures are not automatically reclassified as recoverable.

## Compatibility
- Servers and clients both need this version for the new capacity diagnostics. Older clients remain compatible while snapshots fit their existing receive windows; larger snapshots produce an upgrade message and preserve local queues. A client update alone does not enlarge an old server's limits.
- Pending path plans, conflicts, note contents, histories and caches are retained. This release does not approve or cancel existing plans.
