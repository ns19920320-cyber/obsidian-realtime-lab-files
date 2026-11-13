# Operator automation boundary

No AI agent or prompt executes inside the plugin or service. The external operator may retrieve a user-created sealed review job, invoke `scripts/archive-protected-review.py` and inspect the resulting plan. The Python script can read that service's private blob directory and use the existing `nas` SSH alias only under its explicit backup root. It streams a fixed archive and writes a receipt only after remote verification; it cannot modify phone files or publish note versions.

The app owns scope validation, NAS receipt/hash validation, history/generation checks and recoverable trash after a separate local confirmation. Operator suggestions are not app permissions. Disabling LAB_REVIEW_NAS_ROOT removes the service capability and blocks review/cleanup; originals remain. There are no webhook or model-triggered file actions.
