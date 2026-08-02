# 资源管理后端

## 模块边界

```text
yak-ops-common
  └─ resource DTO / VO / PO / enum / permission code

yak-ops-spi
  └─ ResourceFileSyncProvider（Git/DataOps 同步扩展口）

yak-ops-business-resource
  ├─ Controller / Service / DAO
  ├─ 独立 Hikari + MyBatis-Plus + Flyway
  └─ 资源目录树、版本、校验值和存储路径元数据

yak-ops-plugin-storage
  ├─ storage-api
  ├─ storage-local
  ├─ storage-minio
  ├─ storage-hdfs
  └─ storage-all
```

资源数据库保存目录和文件元数据，Local、MinIO、HDFS 插件只保存物理内容。业务模块只依赖存储 API，不依赖具体实现。

## 接口

基础路径：`/api/v1/resources`

- `POST /directory`：创建目录
- `POST /`：上传文件
- `POST /online-create`：在线创建文本文件
- `GET /{id}`：资源详情
- `GET /list`：查询目录直属资源
- `POST /page`：分页查询
- `GET /tree`：完整资源树
- `PUT /{id}`：重命名或修改描述
- `PUT /{id}/file`：替换文件
- `GET /{id}/content`：在线查看文本内容
- `PUT /{id}/content`：在线更新文本内容
- `POST /{id}/move`：移动文件或目录
- `DELETE /{id}`：递归删除
- `GET /{id}/download`：下载文件
- `GET /storage-plugins`：查看已安装存储插件

接口复用现有资源权限：`resource:view`、`resource:upload`、`resource:download`、`resource:update`、`resource:delete`。

## 存储配置

默认活动存储改为内置 Local，因此启动和使用资源管理不再要求部署 MinIO 或 HDFS。MinIO 插件继续保持启用，以兼容数据库中已有的 `MINIO` 类型资源；只有实际访问 MinIO 资源时才需要对应服务可用。

通过 `yak.resource.storage.type` 选择当前根目录使用的存储类型。

```yaml
yak:
  resource:
    enabled: true
    storage:
      type: LOCAL
      local:
        enabled: true
        base-directory: ./data/resources
        checksum-enabled: true
      minio:
        enabled: true
        endpoint: http://127.0.0.1:9000
        access-key: minioadmin
        secret-key: minioadmin
        bucket: yak-ops
        base-prefix: resources
      hdfs:
        enabled: false
        uri: hdfs://127.0.0.1:9000
        user: hdfs
        base-directory: /yak-ops/resources
```

Local 插件启动时自动创建根目录，上传内容先写入内部暂存目录，校验大小后再原子移动到目标路径。逻辑路径只能位于配置根目录内，并拒绝上级目录、符号链接和内部保留目录。

同一目录树内的资源继承父目录存储类型，当前不允许跨 Local、MinIO、HDFS 移动。

### 部署约束

Local 存储适合单节点部署。多节点部署时，应让所有 Yak Ops 节点挂载同一个共享目录，或者继续使用 MinIO/HDFS 等共享存储。

Docker 部署必须把本地资源目录挂载到持久化卷，例如：

```yaml
services:
  yak-ops:
    volumes:
      - ./data/resources:/app/data/resources
    environment:
      YAK_RESOURCE_STORAGE_TYPE: LOCAL
      YAK_RESOURCE_LOCAL_BASE_DIRECTORY: /app/data/resources
```

切回 MinIO 时可配置：

```bash
YAK_RESOURCE_STORAGE_TYPE=MINIO
YAK_RESOURCE_MINIO_ENABLED=true
```

## Git/DataOps 扩展口

当前只提供 `ResourceFileSyncProvider`，不包含具体 Git 实现。后续插件注册为 Spring Bean 后，会在资源事务提交后收到 `CREATED`、`UPDATED`、`MOVED`、`DELETED` 事件，无需修改资源业务代码。
