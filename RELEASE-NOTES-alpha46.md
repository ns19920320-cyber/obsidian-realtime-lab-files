# 0.5.0-alpha.46

- A new file created at a previously deleted path records the deletion generation it observed. The durable pending version retains that intent through offline operation and restart.
- The server permits recreation only while that exact deletion generation is still current. A competing recreation or newer deletion retains the local body, cached bytes and pending version for review instead of overwriting the other device.
- Existing boolean tombstones remain readable. Ambiguous files discovered on startup or first join are backed up and retained under consistency protection; the plugin does not infer a new creation from an old offline edit.
- Duplicate acknowledged publications remain idempotent and prior history remains available.
- Local tests use the same serial scheduling as CI. The former default parallel run exhausted the fixed convergence deadline while the V1 stress server synchronously persisted each of 200 edits; bounded and serial runs pass without changing the latency assertion.

The matching server source is included in source.zip. Recreating a deleted name requires a server advertising deletion-generation-v1. Older servers keep the new pending version and local file until upgraded; no unsafe protocol fallback is used. This release does not upgrade running servers or alter vault configuration. Avoid downgrading a device while it has pending recreation versions.

Validation uses temporary servers and synthetic files, including offline cold restart, competing devices, stale deletion generation, lost-result replay, legacy ambiguity and retained cache/history. Production vaults are not used for testing.
