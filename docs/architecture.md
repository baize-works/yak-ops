# Hexagonal architecture boundaries

The target dependency direction is `web -> application -> domain`. The domain is
pure Java and owns business state and invariants. Application owns use cases,
commands/results, input ports, and output ports. HTTP request/response types and
their mapping stay in the web adapter.

Persistence (`yak-ops-dao`), Quartz, engine, alarm, and security are outbound
adapters. They implement application/domain ports and must not expose persistence
entities, MyBatis types, framework DTOs, or vendor engine types across a port.
During the physical split of `yak-ops-infrastructure`, each implementation remains
under its adapter package (`infrastructure.persistence`, `.quartz`, `.engine`,
`.alarm`, or `.security`) and adapter-to-adapter calls are forbidden.

Aggregator artifacts ending in `-all` are runtime assembly details. Only boot and
distribution modules may depend on them.

## Enforced migration

`tools/architecture_check.py` runs in Maven's `validate` phase. It rejects new
forbidden imports and dependencies. `tools/architecture-baseline.json` is the
explicit inventory of pre-existing debt, so the reactor stays buildable while the
large migration is completed incrementally. A change that removes debt must also
remove the corresponding baseline entry; the checker rejects stale entries.

Never regenerate the baseline to make a build pass. `--write-baseline` exists only
to bootstrap the inventory. Ports should be moved first, adapters changed to
implement them second, and the obsolete baseline entries removed in the same
commit.
