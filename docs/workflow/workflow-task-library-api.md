# Workflow Published Task Library API

## Scope

This API is the read-only boundary between Workflow authoring and Data Development task authoring.

Workflow may discover and reference published task versions, but it must not read or edit task drafts, plugin-specific definitions, compiled specifications, runtime parameters or secrets.

```text
Workflow Designer
  -> Published Task Library API
  -> immutable Task Version metadata
  -> taskId + versionId + Input/Output Schema
```

## Authorization

Both endpoints require:

```text
workflow:definition:read
```

The current phase applies the existing global workflow read permission. Project-scoped resource authorization remains a later platform capability.

## Search published tasks

```http
GET /api/v1/data-development/tasks/library
```

The endpoint always returns only tasks that satisfy all of the following:

- task status is `PUBLISHED`;
- `published_version_id` is present;
- the task resource is not deleted;
- the projected version is the task's current immutable published version.

### Query parameters

| Parameter | Meaning |
| --- | --- |
| `projectId` | Exact project filter |
| `folderId` | Exact parent folder; use `0` for project root |
| `taskType` | Task type, normalized to uppercase |
| `keyword` | Case-insensitive task/project/type search |
| `favoriteOnly` | Only tasks favorited by the current user |
| `recentlyUsed` | Only tasks executed by the current user |
| `sortBy` | `UPDATED_AT`, `PUBLISHED_AT` or `RECENTLY_USED` |
| `offset` | Zero-based offset, default `0` |
| `limit` | Page size, default `50`, maximum `100` |

When `recentlyUsed=true` and `sortBy` is omitted, ordering defaults to `RECENTLY_USED`.

### Response

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "taskId": "1001",
        "name": "查询订单",
        "description": "通过订单号查询订单",
        "projectId": "10",
        "projectCode": "order-center",
        "projectName": "订单中心",
        "folderId": "20",
        "folderName": "接口任务",
        "taskType": "HTTP",
        "engineType": "HTTP",
        "publishedVersionId": "2003",
        "publishedVersionNumber": 3,
        "pluginVersion": "1.0.0",
        "schemaVersion": 1,
        "inputSchema": {},
        "outputSchema": {},
        "contentDigest": "...",
        "publishedBy": "admin",
        "publishedAt": "2026-08-05T00:30:00",
        "updatedAt": "2026-08-05T00:30:00",
        "favorite": true,
        "lastUsedAt": "2026-08-05T00:35:00"
      }
    ],
    "total": 1,
    "offset": 0,
    "limit": 50
  }
}
```

IDs are serialized as strings so the Workflow V2 frontend can copy them directly into `taskRef` without JavaScript integer precision loss.

## Read one immutable published version

```http
GET /api/v1/data-development/tasks/library/{taskId}/versions/{versionId}
```

This endpoint returns a safe projection for version validation and explicit version upgrades:

- task and project identity;
- task/plugin/schema versions;
- Input Schema and Output Schema;
- content digest and publication metadata;
- whether the version is currently selected by the task.

Historical immutable versions of an active published task may be read. Draft definitions and compiled specifications are never returned.

## Deliberately excluded fields

The Workflow task library never returns:

```text
definitionSnapshot
compiledSpec
runtime.common
runtime.specific
secret values or secret references
HTTP URL / headers / body
Shell command / environment
SQL or Notebook source
```

Execution will resolve the referenced immutable version through the future Task Execution Gateway rather than copying task content into the workflow definition.

## Frontend client

The typed frontend adapter is located at:

```text
yak-ops-ui/src/pages/workflow-management/repository/workflow-task-library.repository.ts
```

It is intentionally not wired into the current Workflow V1 designer in this phase. The next designer step can use it for the left-side 300px task library and drag payload creation.

## Query indexes

Migration `V3__optimize_workflow_task_library.sql` adds read-path indexes for:

- published task library filtering by status/project/type/version;
- current-user recent execution lookup by creator/task/time.

No new business tables or duplicated task snapshots are introduced.
