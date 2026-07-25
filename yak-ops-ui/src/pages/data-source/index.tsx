import ClickSpark from "@/components/ClickSpark";
import { useIntl } from "@umijs/max";
import {
  CheckCircle2,
  ChevronRight,
  Database,
  Grid2X2,
  LayoutList,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Server,
  Trash2,
  Unplug,
  XCircle,
} from "lucide-react";
import { message, Modal, Spin } from "antd";
import { motion } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AddOrEditDataSourceModal from "./components/AddOrEditDataSourceModal";
import DataSourceStatus from "./components/DataSourceStatus";
import {
  environmentTagConfigMap,
  PAGE_ANIMATION,
  PAGE_DEFAULT_PAGINATION,
} from "./constants";
import DatabaseIcons from "./icon/DatabaseIcons";
import "./index.less";
import {
  deleteDataSource,
  fetchDataSourcePage,
  testDataSourceConnection,
} from "./service";
import type {
  DataSourceModalRef,
  DataSourceOperateType,
  DataSourcePageParams,
  DataSourceRecord,
  PaginationInfo,
} from "./types";
import { filterDataSourceList } from "./utils";

const { confirm } = Modal;

type DataSourceFilterKey = "all" | "connected" | "disconnected";
type DataSourceViewMode = "grid" | "list";

const isConnectedStatus = (status: DataSourceRecord["connStatus"]) => {
  const normalized = String(status ?? "").trim().toLowerCase();

  return [
    "1",
    "true",
    "connected",
    "success",
    "succeeded",
    "normal",
    "available",
  ].includes(normalized);
};

const DataSourcePage: React.FC = () => {
  const intl = useIntl();
  const modalRef = useRef<DataSourceModalRef>(null);

  const [loading, setLoading] = useState(false);
  const [dataSourceList, setDataSourceList] = useState<DataSourceRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>(
    PAGE_DEFAULT_PAGINATION
  );
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<DataSourceFilterKey>("all");
  const [viewMode, setViewMode] = useState<DataSourceViewMode>("grid");

  const fetchList = async (params?: Partial<DataSourcePageParams>) => {
    try {
      setLoading(true);

      const requestParams: DataSourcePageParams = {
        pageNo: pagination.pageNo,
        pageSize: pagination.pageSize,
        ...params,
      };

      const response = await fetchDataSourcePage(requestParams);

      if (response.code !== 0) {
        return;
      }

      setDataSourceList(response.data?.bizData || []);
      setPagination(response.data?.pagination || PAGE_DEFAULT_PAGINATION);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statistics = useMemo(() => {
    const connected = dataSourceList.filter((record) =>
      isConnectedStatus(record.connStatus)
    ).length;

    const environmentCount = new Set(
      dataSourceList
        .map((record) => record.environment || record.environmentName)
        .filter(Boolean)
    ).size;

    return {
      total: dataSourceList.length,
      connected,
      disconnected: Math.max(dataSourceList.length - connected, 0),
      environmentCount,
    };
  }, [dataSourceList]);

  const filteredDataSourceList = useMemo(() => {
    const keywordFiltered = filterDataSourceList(
      dataSourceList,
      searchKeyword
    );

    if (activeFilter === "connected") {
      return keywordFiltered.filter((record) =>
        isConnectedStatus(record.connStatus)
      );
    }

    if (activeFilter === "disconnected") {
      return keywordFiltered.filter(
        (record) => !isConnectedStatus(record.connStatus)
      );
    }

    return keywordFiltered;
  }, [activeFilter, dataSourceList, searchKeyword]);

  const handleRefresh = () => {
    fetchList();
  };

  const handleCreate = () => {
    modalRef.current?.open({
      operateType: "CREATE" as DataSourceOperateType,
      onSuccess: handleRefresh,
    });
  };

  const handleEdit = (record: DataSourceRecord) => {
    modalRef.current?.open({
      operateType: "EDIT" as DataSourceOperateType,
      currentRecord: record,
      onSuccess: handleRefresh,
    });
  };

  const handleDelete = (record: DataSourceRecord) => {
    confirm({
      title: intl.formatMessage({
        id: "pages.datasource.delete.confirmTitle",
        defaultMessage: "确认删除该数据源吗？",
      }),
      centered: true,
      content: (
        <span>
          {intl.formatMessage(
            {
              id: "pages.datasource.delete.confirmContentLine1",
              defaultMessage: "即将删除数据源 [{name}]。",
            },
            {
              name: (
                <span style={{ color: "#fe2c55", fontWeight: 600 }}>
                  {record.name}
                </span>
              ),
            }
          )}
          <br />
          {intl.formatMessage({
            id: "pages.datasource.delete.confirmContentLine2",
            defaultMessage: "删除后无法恢复，请谨慎操作。",
          })}
        </span>
      ),
      okText: intl.formatMessage({
        id: "pages.datasource.delete.okText",
        defaultMessage: "删除",
      }),
      cancelText: "取消",
      okType: "primary",
      okButtonProps: {
        size: "small",
        danger: true,
      },
      cancelButtonProps: {
        size: "small",
      },
      maskClosable: true,
      async onOk() {
        if (!record.id) {
          message.error(
            intl.formatMessage({
              id: "pages.datasource.message.idNotExist",
              defaultMessage: "数据源 ID 不存在",
            })
          );
          return;
        }

        const response = await deleteDataSource(record.id);

        if (response.code !== 0) {
          return;
        }

        message.success(response.message || "删除成功");
        handleRefresh();
      },
    });
  };

  const handleTestConnection = async (record: DataSourceRecord) => {
    if (!record.id) {
      message.error(
        intl.formatMessage({
          id: "pages.datasource.message.unknownError",
          defaultMessage: "数据源 ID 不存在",
        })
      );
      return;
    }

    try {
      await testDataSourceConnection(record.id);

      message.success(
        intl.formatMessage({
          id: "pages.datasource.message.connectSuccess",
          defaultMessage: "连接测试成功",
        })
      );

      handleRefresh();
    } catch {
      message.error("连接测试失败，请检查数据源配置");
    }
  };

  const renderDataSourceCard = (record: DataSourceRecord) => {
    const environmentConfig =
      environmentTagConfigMap[record.environment || ""] || {
        text: record.environmentName || "未分类",
        color: "#667085",
        backgroundColor: "#f2f4f7",
        icon: null,
      };

    const connected = isConnectedStatus(record.connStatus);

    return (
      <motion.article
        key={record.id}
        variants={PAGE_ANIMATION.fadeUp}
        className={[
          "datasource-item",
          viewMode === "list" ? "datasource-item--list" : "",
        ].join(" ")}
      >
        <div className="datasource-item__main">
          <div className="datasource-item__identity">
            <div className="datasource-item__database-icon">
              <DatabaseIcons
                dbType={record.dbType}
                width="30"
                height="30"
              />
            </div>

            <div className="datasource-item__name-block">
              <div className="datasource-item__title-row">
                <h3 title={record.name}>{record.name || "未命名数据源"}</h3>

                <span
                  className="datasource-environment-tag"
                  style={{
                    color: environmentConfig.color,
                    background: environmentConfig.backgroundColor,
                  }}
                >
                  {environmentConfig.icon}
                  {record.environmentName || environmentConfig.text}
                </span>
              </div>

              <p title={record.jdbcUrl}>
                {record.jdbcUrl || "暂未配置连接地址"}
              </p>
            </div>
          </div>

          <div className="datasource-item__quick-actions">
            <button
              type="button"
              title="测试连接"
              onClick={() => handleTestConnection(record)}
            >
              <Unplug size={15} strokeWidth={1.9} />
            </button>

            <button
              type="button"
              title="编辑数据源"
              onClick={() => handleEdit(record)}
            >
              <Pencil size={15} strokeWidth={1.9} />
            </button>

            <button
              type="button"
              className="is-danger"
              title="删除数据源"
              onClick={() => handleDelete(record)}
            >
              <Trash2 size={15} strokeWidth={1.9} />
            </button>
          </div>
        </div>

        <div className="datasource-item__details">
          <div className="datasource-detail-cell">
            <span>连接状态</span>
            <DataSourceStatus status={record.connStatus} />
          </div>

          <div className="datasource-detail-cell">
            <span>数据源类型</span>
            <strong>{String(record.dbType || "-")}</strong>
          </div>

          <div className="datasource-detail-cell">
            <span>最近更新</span>
            <strong>{record.updateTime || "-"}</strong>
          </div>
        </div>

        <div className="datasource-item__footer">
          <span
            className={[
              "datasource-connection-indicator",
              connected ? "is-connected" : "is-disconnected",
            ].join(" ")}
          >
            {connected ? (
              <CheckCircle2 size={14} strokeWidth={2} />
            ) : (
              <XCircle size={14} strokeWidth={2} />
            )}
            {connected ? "当前连接可用" : "当前连接不可用"}
          </span>

          <button
            type="button"
            className="datasource-detail-button"
            onClick={() => handleEdit(record)}
          >
            查看详情
            <ChevronRight size={15} strokeWidth={2} />
          </button>
        </div>
      </motion.article>
    );
  };

  return (
    <>
      <ClickSpark
        sparkColor="#fe2c55"
        sparkSize={9}
        sparkRadius={14}
        sparkCount={7}
        duration={360}
        easing="ease-out"
        extraScale={1}
      >
        <div className="datasource-page">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={PAGE_ANIMATION.sectionStagger}
            className="datasource-page__panel"
          >
            <motion.header
              variants={PAGE_ANIMATION.fadeUp}
              className="datasource-header"
            >
              <div>
                <div className="datasource-header__eyebrow">
                  RESOURCE CENTER
                </div>

                <h1>数据源管理</h1>

                <p>
                  集中维护数据库连接、运行环境与连通状态，为同步任务提供统一的数据接入能力。
                </p>
              </div>

              <button
                type="button"
                className="datasource-create-button"
                onClick={handleCreate}
              >
                <Plus size={17} strokeWidth={2.2} />
                新建数据源
              </button>
            </motion.header>

            <motion.section
              variants={PAGE_ANIMATION.fadeUp}
              className="datasource-overview"
            >
              <div className="datasource-overview__item">
                <span className="datasource-overview__icon">
                  <Database size={20} strokeWidth={1.8} />
                </span>
                <div>
                  <span>全部数据源</span>
                  <strong>{statistics.total}</strong>
                </div>
              </div>

              <div className="datasource-overview__item">
                <span className="datasource-overview__icon is-success">
                  <CheckCircle2 size={20} strokeWidth={1.8} />
                </span>
                <div>
                  <span>连接正常</span>
                  <strong>{statistics.connected}</strong>
                </div>
              </div>

              <div className="datasource-overview__item">
                <span className="datasource-overview__icon is-warning">
                  <XCircle size={20} strokeWidth={1.8} />
                </span>
                <div>
                  <span>连接异常</span>
                  <strong>{statistics.disconnected}</strong>
                </div>
              </div>

              <div className="datasource-overview__item">
                <span className="datasource-overview__icon is-neutral">
                  <Server size={20} strokeWidth={1.8} />
                </span>
                <div>
                  <span>运行环境</span>
                  <strong>{statistics.environmentCount}</strong>
                </div>
              </div>
            </motion.section>

            <motion.section
              variants={PAGE_ANIMATION.fadeUp}
              className="datasource-workbench"
            >
              <div className="datasource-workbench__tabs">
                {[
                  {
                    key: "all" as const,
                    label: "全部数据源",
                    count: statistics.total,
                  },
                  {
                    key: "connected" as const,
                    label: "已连接",
                    count: statistics.connected,
                  },
                  {
                    key: "disconnected" as const,
                    label: "未连接",
                    count: statistics.disconnected,
                  },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={
                      activeFilter === item.key ? "is-active" : ""
                    }
                    onClick={() => setActiveFilter(item.key)}
                  >
                    {item.label}
                    <span>{item.count}</span>
                  </button>
                ))}
              </div>

              <div className="datasource-workbench__tools">
                <label className="datasource-search">
                  <Search size={16} strokeWidth={1.8} />
                  <input
                    value={searchKeyword}
                    onChange={(event) =>
                      setSearchKeyword(event.target.value)
                    }
                    placeholder="搜索数据源名称或连接地址"
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      aria-label="清空搜索"
                      onClick={() => setSearchKeyword("")}
                    >
                      ×
                    </button>
                  )}
                </label>

                <button
                  type="button"
                  className="datasource-tool-button"
                  title="刷新"
                  onClick={handleRefresh}
                >
                  <RefreshCw
                    size={16}
                    strokeWidth={1.8}
                    className={loading ? "is-spinning" : ""}
                  />
                </button>

                <div className="datasource-view-switch">
                  <button
                    type="button"
                    className={viewMode === "grid" ? "is-active" : ""}
                    title="卡片视图"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid2X2 size={16} strokeWidth={1.8} />
                  </button>

                  <button
                    type="button"
                    className={viewMode === "list" ? "is-active" : ""}
                    title="列表视图"
                    onClick={() => setViewMode("list")}
                  >
                    <LayoutList size={17} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </motion.section>

            <motion.div
              variants={PAGE_ANIMATION.fadeUp}
              className="datasource-result-summary"
            >
              共找到
              <strong>{filteredDataSourceList.length}</strong>
              个数据源
            </motion.div>

            <Spin spinning={loading}>
              <motion.section
                variants={PAGE_ANIMATION.cardStagger}
                initial="hidden"
                animate="visible"
                className={[
                  "datasource-list",
                  viewMode === "list" ? "datasource-list--list" : "",
                ].join(" ")}
              >
                {filteredDataSourceList.map(renderDataSourceCard)}
              </motion.section>

              {!loading && filteredDataSourceList.length === 0 && (
                <div className="datasource-empty">
                  <div className="datasource-empty__icon">
                    <Database size={36} strokeWidth={1.5} />
                    <Plus size={17} strokeWidth={2.2} />
                  </div>

                  <h3>
                    {searchKeyword || activeFilter !== "all"
                      ? "没有找到符合条件的数据源"
                      : "还没有创建数据源"}
                  </h3>

                  <p>
                    {searchKeyword || activeFilter !== "all"
                      ? "可以调整搜索关键词或切换筛选条件后重试。"
                      : "创建第一个数据源，开始配置数据同步与运行任务。"}
                  </p>

                  {!searchKeyword && activeFilter === "all" && (
                    <button type="button" onClick={handleCreate}>
                      <Plus size={16} strokeWidth={2.2} />
                      新建数据源
                    </button>
                  )}
                </div>
              )}
            </Spin>
          </motion.div>
        </div>
      </ClickSpark>

      <AddOrEditDataSourceModal ref={modalRef} />
    </>
  );
};

export default DataSourcePage;