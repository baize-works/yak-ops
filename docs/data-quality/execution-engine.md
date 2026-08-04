# Data Quality Execution Engine

## Scope

Persisted quality rules can be submitted manually or by Yak Schedule. Both paths create
the same immutable execution snapshot and use the same bounded worker.

```text
Quality rule / Yak Schedule
  -> create immutable execution snapshot
  -> dispatch after the database transaction commits
  -> bounded quality executor
  -> datasource Catalog read-only SQL
  -> metric evaluation
  -> execution record + latest rule projection
  -> quality report page
```

Manual attempts use `trigger_type=MANUAL`. Cron-triggered attempts use
`trigger_type=SCHEDULE`. Schedule registration and reconciliation are documented in
[`scheduling.md`](./scheduling.md).

## Persistence

`yak_quality_execution` stores one immutable snapshot per attempt:

- rule and datasource identity
- table/column/custom-SQL snapshot
- operator and threshold snapshot
- trigger/operator information
- lifecycle timestamps and duration
- generated SQL, numeric/display metric and expected value
- execution status, quality result and sanitized error message

Deleting or editing a rule does not rewrite its historical execution records.

## State model

```text
WAITING -> RUNNING -> SUCCESS
                   -> FAILED
```

A successful execution has a separate check result:

- `PASSED`
- `NOT_PASSED`

Infrastructure, SQL, metadata or conversion failures use
`execution_status=FAILED` and `check_result=UNKNOWN`.

Only one `WAITING` or `RUNNING` execution is accepted for a rule at a time. The rule
row is locked while creating the snapshot so concurrent clicks or overlapping
schedule triggers cannot enqueue duplicate active attempts.

## SQL strategies

The engine obtains an identifier-quoted `SELECT` template from the datasource plugin
Catalog, then compiles a read-only metric query:

| Rule type | Metric |
| --- | --- |
| `TABLE_ROW_COUNT` | `COUNT(*)` |
| `COLUMN_NOT_NULL` | non-null percentage |
| `COLUMN_UNIQUE` | distinct percentage among non-null values |
| `COLUMN_RANGE` | minimum, maximum or both according to the comparator |
| `DATA_FRESHNESS` | age in hours from `MAX(timestamp_column)` |
| `CUSTOM_SQL` | first value of the single-row metric result |

All queries are routed through `DataSourceCatalogService`. The browser never receives
datasource credentials, and the existing Catalog guard only permits a single
`SELECT` statement.

## Recovery and capacity

The executor uses a bounded `ThreadPoolTaskExecutor`. Queue rejection is persisted
as a failed execution rather than being silently lost.

On application startup:

- interrupted `RUNNING` executions are marked failed because the local worker cannot
  safely resume an in-flight JDBC statement;
- persisted `WAITING` executions are dispatched again in queue order;
- the latest rule projection is repaired to `ERROR` for interrupted attempts;
- Yak Schedule definitions are rebuilt from persisted scheduled rules.

## APIs

```http
POST /api/v1/data-quality/rule/{ruleId}/run
POST /api/v1/data-quality/execution/page
GET  /api/v1/data-quality/execution/{executionNo}
```

Scheduled execution is an internal handler path and does not expose a second public
run API. This keeps permission checks and external commands focused on manual
execution while Quartz uses the same business service internally.

## Follow-up

Distributed workers, cancellation, query timeout policy and alert-channel adapters
can extend the execution layer without changing rule authoring or schedule identity.
