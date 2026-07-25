# Persistence plugins

This family contains database-dialect and data-access runtime implementations; it
is **not** a DAO-plugin discovery mechanism. `yak-ops-dao` owns repositories and
mappers, while these artifacts select JDBC drivers, Flyway support, dialects, and
database monitoring:

* `yak-ops-persistence-api` — stable dialect/monitor contracts;
* `yak-ops-persistence-vendor-*` — database-specific implementations;
* `yak-ops-persistence-all` — dependency-only runtime aggregate.

The `persistence` name intentionally prevents overlap with `yak-ops-dao`.
