# Engine neutralization ledger

The case-insensitive inventory is generated from tracked files so build artifacts cannot hide
or create findings:

```bash
python3 tools/check-engine-neutrality.py --inventory > /tmp/engine-neutrality.json
```

It covers `seatunnel`, `sea_tunnel`, and `zeta`, including occurrences embedded in REST paths
and status constants. Each matching file is classified as Java, POM, configuration, SQL, UI,
log, API, documentation, or other. The JSON output is the ledger of record rather than a stale
hand-maintained list.

## Gates and staged retirement

Domain and engine-contract sources are zero-match gates. Application debt is frozen at its
current baseline and may only decrease; set its baseline to zero after internal symbol renames
land. The path allowlist is deliberately restricted to the legacy adapter, compatibility
migrations, and compatibility API tests. Delete entries as each boundary is retired.

Compatibility rules:

1. Historical HTTP DTOs live only in `yak-ops-web`; controllers immediately translate them to
   neutral application commands/results, and every legacy response field documents its removal
   version.
2. Configuration aliases flow in one direction: `engine.*`, then `legacy.engine.*`, then the
   deprecated vendor prefix with a once-only warning. Business code never reads deprecated keys.
3. Schema evolution uses new migrations: expand with `engine_endpoint`, `engine_endpoint_id`, and
   neutral engine/status columns; backfill and dual-read-validate; switch writes; then contract.
4. Persistence conversion for historical engine keys and job statuses belongs only in a
   persistence legacy adapter. Neither domain nor application code interprets vendor values.
5. The UI uses neutral types, routes, copy, API clients, and state. A historical route may perform
   one redirect but must not leak its vocabulary into new state.

## Feature deletion audit

Before removing AI, topology, checkpoint, or another apparently unused feature, record searches
for its controllers, permission identifiers, menu records, scheduled jobs, alert rules, and UI
imports/routes. Deletion is permitted only when all seven surfaces are empty or migrated and the
relevant integration tests prove that no compatibility endpoint is still active.
