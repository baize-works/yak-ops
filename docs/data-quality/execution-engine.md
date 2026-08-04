# Data Quality Execution Engine

## Scope

This phase turns persisted quality rules into real manual checks and replaces the quality-report mock data with durable execution records.

The execution path is intentionally local and bounded:

```text
Quality rule page
  -> create immutable execution snapshot
  -> dispatch after the database transaction commits
  -> bounded quality executor
  -> datasource Catalog read-only SQL
  -> metric evaluation
  -> execution record + latest rule projection
  -> quality report page
```

Cron scheduling is not activated in this phase. Rules can still persist schedule configuration, while a later phase can dispatch the same execution snapshot with `trigger_type=SCHEDULE`.

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

Infrastructure, SQL, metadata or conversion failures use `execution_status=FAILED` and `check_result=UNKNOWN`.

Only one `WAITING` or `RUNNING` execution is accepted for a rule at a time. The rule row is locked while creating the snapshot so concurrent clicks cannot enqueue duplicate active attempts.

## SQL strategies

The engine obtains an identifier-quoted `SELECT` template from the datasource plugin Catalog, then compiles a read-only metric query:

| Rule type | Metric |
| --- | --- |
| `TABLE_ROW_COUNT` | `COUNT(*)` |
| `COLUMN_NOT_NULL` | non-null percentage |
| `COLUMN_UNIQUE` | distinct percentage among non-null values |
| `COLUMN_RANGE` | minimum, maximum or both according to the comparator |
| `DATA_FRESHNESS` | age in hours from `MAX(timestamp_column)` |
| `CUSTOM_SQL` | first value of the single-row metric result |

All queries are routed through `DataSourceCatalogService`. The browser never receives datasource credentials, and the existing Catalog guard only permits a single `SELECT` statement.

## Recovery and capacity

The executor uses a bounded `ThreadPoolTaskExecutor`. Queue rejection is persisted as a failed execution rather than being silently lost.

On application startup:

- interrupted `RUNNING` executions are marked failed because the local worker cannot safely resume an in-flight JDBC statement;
- persisted `WAITING` executions are dispatched again in queue order;
- the latest rule projection is repaired to `ERROR` for interrupted attempts.

## APIs

```http
POST /api/v1/data-quality/rule/{ruleId}/run
POST /api/v1/data-quality/execution/page
GET  /api/v1/data-quality/execution/{executionNo}
```

## Follow-up

The same execution snapshot can later be reused by a Yak Schedule dispatcher, distributed workers, cancellation, timeout policies and alert-channel adapters without changing the rule authoring contract.
