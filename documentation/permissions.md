# Permissions

Scope derives from the per-service vault token and verified server identity; there is no SQL database, RLS or user-role system. Existing current-file/history operations remain vault-wide.

| Resource / operation | Reporting device | Same-vault operator | Other vault / unauthenticated |
|---|---|---|---|
| Ordinary sanitized diagnostics | Count-only reporting | Read counts | Denied by token / identity |
| Prepare / seal review snapshot | Explicit local click plus device/socket binding | Cannot impersonate a different active device socket | Denied |
| Read sealed review job / preview | Authenticated vault connection | Authenticated vault connection | Denied |
| Read actual NAS receipt / verify archive | Service, under fixed configured root | Operator with existing NAS SSH account | No device-supplied command/path |
| Clean phone originals | Explicit confirmation in that device, verified receipt, history/generation and byte guards | Cannot remotely invoke local file deletion | Denied; no remote filesystem command API |
| Clear unrelated queues / overwrite content | No new permission | No new permission | Denied by the review flow |

The new export is an intentional disclosure of selected paths and payloads to the same vault service and its configured NAS. It is outside ordinary diagnostic telemetry and is off until the user clicks.
