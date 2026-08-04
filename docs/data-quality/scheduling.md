# Data Quality Scheduling

## Scope

This phase connects persisted quality-rule Cron configuration to Yak Schedule.

```text
yak_quality_rule
  -> QualityRuleScheduleRegistrar
  -> Yak Schedule / Quartz
  -> QualityRuleScheduleHandler
  -> QualityExecutionService.runScheduled
  -> immutable quality execution snapshot
  -> bounded quality worker
  -> quality report
```

Manual and scheduled checks share the same execution snapshot, worker, SQL compiler,
metric evaluator and result persistence. Only the trigger type and operator differ.

## Schedule identity

Each rule owns one stable schedule:

```text
namespace: data-quality
key:       rule-{ruleId}
handler:   qualityRuleScheduleHandler
```

The payload stores `ruleId` as a string so schedule-definition equality is stable
across JSON number implementations.

## Reconciliation

`JobScheduleRegistrationCoordinator` runs once during startup and periodically
afterwards.

For each persisted rule with `schedule_mode=SCHEDULE` and a valid Cron expression,
the registrar:

- creates the schedule when it is missing;
- replaces it when Cron, enabled state or metadata changes;
- pauses it by saving `enabled=false`;
- deletes the Quartz schedule after the rule is deleted or switched to manual mode;
- removes orphaned schedules in the `data-quality` namespace.

This makes the quality-rule table the source of truth. A memory Quartz JobStore can
therefore be rebuilt after every application restart. Production may switch Yak
Schedule to a JDBC JobStore without changing quality business code.

## Trigger policy

Quality schedules use:

- `ConcurrencyPolicy.FORBID`;
- `MisfirePolicy.FIRE_ONCE_NOW`;
- Framework trigger retries `0`.

The quality execution layer also locks the rule row and checks for active
`WAITING/RUNNING` executions. If a previous check is still active, the handler
accepts the trigger as skipped instead of creating a duplicate execution.

A trigger racing with rule disable, delete or a switch to manual mode is also
accepted as skipped. The next reconciliation removes or pauses the obsolete
schedule.

## Cron validation

Rule creation and update validate Cron expressions before persistence. Invalid
custom Cron values are rejected by the quality-rule API instead of becoming a
schedule that repeatedly fails registration.

## Operations

Scheduled attempts appear in the existing quality report with:

```text
triggerType = SCHEDULE
operator    = yak-schedule
```

They use the same `WAITING -> RUNNING -> SUCCESS/FAILED` lifecycle and the same
`PASSED/NOT_PASSED/UNKNOWN` quality result model as manual attempts.
