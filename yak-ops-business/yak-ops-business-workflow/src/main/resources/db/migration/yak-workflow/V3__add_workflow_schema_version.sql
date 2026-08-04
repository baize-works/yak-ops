ALTER TABLE yak_wf_definition
  ADD COLUMN draft_schema_version INT NOT NULL DEFAULT 1 AFTER max_parallelism;

ALTER TABLE yak_wf_version
  ADD COLUMN schema_version INT NOT NULL DEFAULT 1 AFTER version;
