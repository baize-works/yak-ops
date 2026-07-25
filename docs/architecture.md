# Hexagonal architecture boundaries

The target dependency direction is `web -> application -> domain`. The domain is pure Java and owns business state and
invariants. Application owns use cases, commands/results, input ports, and output ports. HTTP request/response types and
their mapping stay in the web adapter.

Persistence (`yak-ops-dao`), Quartz, engine, alarm, and security are outbound adapters. They implement
application/domain ports and must not expose persistence entities, MyBatis types, framework DTOs, or vendor engine types
across a port. During the physical split of `yak-ops-infrastructure`, each implementation remains under its adapter
package (`infrastructure.persistence`, `.quartz`, `.engine`,
`.alarm`, or `.security`) and adapter-to-adapter calls are forbidden.

Aggregator artifacts ending in `-all` are runtime assembly details. Only boot and distribution modules may depend on
them.

## Enforced migration

`tools/architecture_check.py` runs in Maven's `validate` phase. It rejects new forbidden imports and
dependencies. `tools/architecture-baseline.json` is the explicit inventory of pre-existing debt, so the reactor stays
buildable while the large migration is completed incrementally. A change that removes debt must also remove the
corresponding baseline entry; the checker rejects stale entries.

Never regenerate the baseline to make a build pass. `--write-baseline` exists only to bootstrap the inventory. Ports
should be moved first, adapters changed to implement them second, and the obsolete baseline entries removed in the same
commit.

## Plugin families

Every plugin family uses the same four-layer vocabulary:

| Layer | Responsibility | Dependency rule |
| --- | --- | --- |
| `*-api` / `*-spi` | JDK-level contracts and stable, transport-neutral models | no web DTO or vendor engine type |
| `*-support` (alarm discovery remains named `alarm-runtime`) | registry, discovery, lifecycle, and reusable implementations | depends on its API only, plus generic utilities |
| `*-vendor-*` | one vendor implementation | depends on that family's API/support, never web contracts |
| `*-all` | dependency-only runtime selection | contains no source or business logic |

Boot selects `yak-ops-engine-all`, `yak-ops-datasource-all`, `yak-ops-alarm-all`, and `yak-ops-persistence-all`. It
never selects MySQL, webhook, or another concrete vendor. Distribution depends only on boot and packages publishing
resources.

Datasource metadata uses datasource-owned models for connection tests, tables, columns, and schema discovery. HTTP
DTO/VO conversion is an inbound web-adapter responsibility. Apache SeaTunnel connector rendering is legacy-engine
behavior and must remain in `yak-ops-engine-legacy`; its rendering seeds live under
`db/legacy-seed`, separately from generic persistence migrations.

Alarm application use cases see only gateway/catalog ports. `alarm-runtime` owns factory discovery and channel
lifecycle, while `alarm-vendor-*` artifacts perform actual delivery.

The old `yak-ops-dao-plugin` family was database implementation rather than DAO plugin discovery. It is therefore
named `yak-ops-persistence-*`; `yak-ops-dao`
continues to own repositories and mappers.
