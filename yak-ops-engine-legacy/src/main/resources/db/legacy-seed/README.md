# Legacy engine rendering metadata

These seeds describe Apache SeaTunnel connector rendering options. They are owned by
and versioned with the legacy engine adapter; they are deliberately outside Flyway's
generic `db/migration` locations. A deployment that enables the legacy adapter must
apply the database-specific seed after the persistence schema migration.

Datasource identity, connection properties, connectivity checks, and discovered
schemas remain engine-neutral and must not be added here.
