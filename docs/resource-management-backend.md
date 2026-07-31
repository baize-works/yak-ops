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
  ├─ storage-minio
  ├─ storage-hdfs
  └─ storage-all
```

资源数据库保存目录和文件元数据，MinIO/HDFS 插件只保存物理内容。业务模块只依赖存储 API，不依赖具体实现。

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

默认启用 MinIO，HDFS 默认关闭。通过 `yak.resource.storage.type` 选择当前根目录使用的存储类型。

```yaml
yak:
  resource:
    enabled: true
    storage:
      type: MINIO
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

同一目录树内的资源继承父目录存储类型，当前不允许跨 MinIO/HDFS 移动。

## Git/DataOps 扩展口

本次只提供 `ResourceFileSyncProvider`，不包含具体 Git 实现。后续插件注册为 Spring Bean 后，会在资源事务提交后收到 `CREATED`、`UPDATED`、`MOVED`、`DELETED` 事件，无需修改资源业务代码。
