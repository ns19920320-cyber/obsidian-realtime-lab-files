# Protected data and recovery flows

| Actor / precondition | Boundary and protected step | Side effects / expected deny |
|---|---|---|
| User, initialized connected vault | Opens Backup & Review and clicks backup; plugin checks ready identity, supported paths and pending/dirty/path-operation guards | Reads only selected hold files. No export on ordinary startup; changed/unreadable files fail without cleanup. |
| Reporting device | Authenticated WebSocket `protected-review-prepare` binds manifest deviceId to that socket's diagnostic identity and matching serverId | Stores bounded immutable job metadata. A different socket cannot prepare/seal/check as the active device. Reusing a jobId with another manifest fails. |
| Reporting device | Existing authenticated BlobTransfer uploads only missing hashes; seal requires every referenced payload | Adds staging blobs only. No Yjs version publication or history mutation. Interrupted export retains local files and can be retried with the same manifest. |
| Vault operator with filesystem + NAS access | Retrieves sealed job through the authenticated service, invokes archive CLI | Hashes actual staged payloads, streams archive directly to NAS, checks remote SHA256 and tar readability, then atomically writes receipt. Partial/failing copies have no valid receipt. |
| Connected device / operator | Requests plan; service reads configured NAS receipt and independently checks archive checksum | Returns only same-path historical duplicates whose server path is tombstoned. Missing/corrupt/mismatched receipt denies cleanup. |
| User confirms exact displayed candidates | Each candidate is bound to the exported manifest; server rechecks history and deletion generation; client rechecks actual bytes, active edits and pending work | Moves only unchanged duplicate to recoverable trash and persists only that hold's removal. Unknown, unique or changed content remains. A read or persistence failure is reported, not hidden by blanket queue clearing. |

All browser/device → server traffic uses the existing per-vault token and verified service identity. Server → NAS uses a fixed configured root plus validated UUID components; devices cannot supply a host, shell command or arbitrary NAS path. No side effect is triggered by receipt arrival alone.
