# Legacy engine adapter

This optional adapter quarantines the historical REST engine integration behind
`yak-ops-engine-contract`. It is disabled by default and is activated only with:

```properties
legacy.engine.enabled=true
```

New transport settings use `legacy.engine.client.*`. The deprecated vendor-prefixed
client settings are read only by the compatibility binder and must not be used by
new code. Wire DTOs, authentication, exceptions, and status conversion remain under
`internal.vendor`; they are mapped to neutral contract models before returning from
the adapter and must never be imported by contract or application modules.

## Production retirement runbook

1. Confirm there are no active legacy executions, then disable client-management
   endpoints and job scheduling for the legacy engine.
2. Stop legacy status synchronization only after submission and scheduling are off.
3. Export historical execution records and logs, and verify the export can be read.
4. Remove this adapter, its `yak-ops-engine-all` dependency, compatibility binding,
   and vendor libraries only when every deletion gate below passes.

Deletion gates (all are mandatory):

- no active legacy job exists;
- no endpoint uses the legacy engine key;
- access logs show no calls to historical vendor API paths;
- no database row still requires vendor-specific status interpretation.
