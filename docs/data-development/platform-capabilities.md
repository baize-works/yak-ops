# Data Development Platform Capabilities

## Scope

Phase four turns the data-development workbench and execution engines into an operable platform. It adds runtime environments, encrypted secrets, reusable parameter templates, engine health probes, platform metrics and a durable audit trail.

## Runtime resolution

The execution snapshot keeps only platform references:

- `runtime.common.environmentId`
- `runtime.common.parameterTemplateId`
- `runtime.common.secretKeys`

The worker resolves them immediately before invoking the task plugin. Plaintext secrets are never written to task drafts, published versions, execution snapshots, events or results.

Resolution precedence is:

1. parameter-template values;
2. environment variables;
3. task `runtime.common.parameters`;
4. execution input.

Environment variables are available both at the top level and below `env`. Selected secrets are available below `secret`, for example `${secret.API_TOKEN}`.

## Secret encryption

Secrets use AES-256-GCM with a random 96-bit IV per value. The AES key is derived from the configured platform master key using SHA-256.

Configure the master key through:

```bash
export YAK_DATA_DEVELOPMENT_PLATFORM_MASTER_KEY='replace-with-a-long-random-value'
```

The API never returns ciphertext or plaintext. Secret list responses contain metadata and a fixed mask only. Losing or changing the master key makes existing secrets undecryptable, so production deployments must manage this value through the deployment secret store.

## Engine health

Engine endpoints support three probe modes:

- `LOCAL_PLUGIN`: verifies the task plugin is registered in `TaskPluginCatalog`;
- `HTTP`: performs a bounded GET request and treats 2xx/3xx as healthy;
- `TCP`: opens a bounded socket connection to `host:port`.

Health checks update the durable endpoint status and are visible in the platform page. They are diagnostics only; execution routing remains owned by the task definition and engine plugin.

## Audit

The platform writes audit records for:

- environment, secret, template and engine endpoint mutations;
- individual and bulk health checks;
- execution creation and cancellation.

Audit summaries intentionally exclude secret values and full task definitions.

## UI

The platform page is available at `/data-development/platform` and is linked from the workbench header. It provides:

- a 24-hour operational overview;
- environment CRUD;
- encrypted-secret CRUD;
- parameter-template CRUD;
- engine endpoint management and health checks;
- recent audit records.

The workbench runtime panel loads live environments, templates and secret metadata from the platform API.

## Follow-up work

The current phase intentionally leaves these concerns for later iterations:

- external KMS/Vault integration and key rotation;
- project-scoped RBAC beyond the existing route permissions;
- distributed engine routing and worker-group capacity;
- scheduled health checks and alert rules;
- audit export and retention policies;
- environment promotion workflows and approval gates.
