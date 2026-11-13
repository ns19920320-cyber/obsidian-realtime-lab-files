# Background work

Existing plugin foreground checks run about every 10 seconds; desktop background heartbeat may reconnect without focus. RetryLedger schedules bounded backoff up to roughly 60 seconds; automatic consistency scans require an idle foreground vault and normally repeat every 10 minutes. They retain pending versions and do not approve path plans.

Protected-review export, NAS archive and cleanup are explicit actions. No scheduled export, NAS copy, automatic trashing or receipt-arrival trigger is added. Review job IDs are immutable/idempotent; staged files and local pending queues survive interruption. Job metadata has a fixed capacity and is not pruned automatically.
