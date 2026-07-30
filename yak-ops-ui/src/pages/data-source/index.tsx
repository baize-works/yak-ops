import ClickSpark from '@/components/ClickSpark';
import { YAK_OPS_PERMISSIONS } from '@/constants/yakOpsPermissions';
import usePermissionAccess from '@/hooks/usePermissionAccess';
import { API_SUCCESS_CODE } from '@/services/http/response';
import { useIntl } from '@umijs/max';
import { message, Modal, Pagination, Spin } from 'antd';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import AddOrEditDataSourceModal from './components/AddOrEditDataSourceModal';
import DataSourceStatus from './components/DataSourceStatus';
import {
  environmentTagConfigMap,
  PAGE_ANIMATION,
  PAGE_DEFAULT_PAGINATION,
} from './constants';
import DatabaseIcons from './icon/DatabaseIcons';
import './index.less';
import {
  deleteDataSource,
  fetchDataSourceDetail,
  fetchDataSourcePage,
  fetchDataSourceSummary,
  testDataSourceConnection,
} from './service';
import type {
  DataSourceId,
  DataSourceModalRef,
  DataSourceRecord,
  DataSourceSummary,
  PaginationInfo,
} from './types';
import { DataSourceOperateType } from './types';

const { confirm } = Modal;

type DataSourceFilterKey =
  | 'all'
  | 'connected'
  | 'disconnected'
  | 'unknown';
type DataSourceViewMode = 'grid' | 'list';

const EMPTY_SUMMARY: DataSourceSummary = {
  total: 0,
  connected: 0,
  disconnected: 0,
  unknown: 0,
  environmentCount: 0,
};

const normalizeStatus = (status?: string) =>
  String(status || 'UNKNOWN').trim().toUpperCase();

const isConnectedStatus = (status?: string) =>
  ['CONNECTED', 'CONNECTED_SUCCESS', 'SUCCESS', 'SUCCEEDED'].includes(
    normalizeStatus(status),
  );

const isDisconnectedStatus = (status?: string) =>
  ['DISCONNECTED', 'CONNECTED_FAILED', 'FAILED'].includes(
    normalizeStatus(status),
  );

const statusForFilter = (filter: DataSourceFilterKey) =>
  filter === 'all' ? undefined : filter.toUpperCase();

const recordKey = (id?: DataSourceId) => String(id ?? '');

const DataSourcePage = () => {
  const intl = useIntl();
  const modalRef = useRef<DataSourceModalRef>(null);
  const requestSeqRef = useRef(0);
  const { can } = usePermissionAccess();

  const canCreate = can(YAK_OPS_PERMISSIONS.dataSource.create);
  const canUpdate = can(YAK_OPS_PERMISSIONS.dataSource.update);
  const canDelete = can(YAK_OPS_PERMISSIONS.dataSource.delete);
  const canTest = can(YAK_OPS_PERMISSIONS.dataSource.test);

  const [loading, setLoading] = useState(false);
  const [dataSourceList, setDataSourceList] = useState<DataSourceRecord[]>([]);
  const [summary, setSummary] = useState<DataSourceSummary>(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState<PaginationInfo>(
    PAGE_DEFAULT_PAGINATION,
  );
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeFilter, setActiveFilter] =
    useState<DataSourceFilterKey>('all');
  const [viewMode, setViewMode] = useState<DataSourceViewMode>('grid');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [testingId, setTestingId] = useState('');
  const [editingId, setEditingId] = useState('');

  const fetchList = useCallback(async () => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    setLoading(true);

    const requestParams = {
      pageNo: pagination.pageNo,
      pageSize: pagination.pageSize,
      keyword: searchKeyword.trim() || undefined,
      connStatus: statusForFilter(activeFilter),
    };

    try {
      const [pageResult, summaryResult] = await Promise.allSettled([
        fetchDataSourcePage(requestParams),
        fetchDataSourceSummary(),
      ]);
      if (requestSeq !== requestSeqRef.current) return;

      if (
        pageResult.status === 'fulfilled' &&
        pageResult.value.code === API_SUCCESS_CODE
      ) {
        const records = pageResult.value.data?.bizData || [];
        const nextPagination =
          pageResult.value.data?.pagination || PAGE_DEFAULT_PAGINATION;

        if (
          records.length === 0 &&
          nextPagination.total > 0 &&
          requestParams.pageNo > 1
        ) {
          setPagination((current) => ({
            ...current,
            pageNo: Math.max(1, requestParams.pageNo - 1),
            total: nextPagination.total,
          }));
        } else {
          setDataSourceList(records);
          setPagination(nextPagination);
        }
      }

      if (
        summaryResult.status === 'fulfilled' &&
        summaryResult.value.code === API_SUCCESS_CODE
      ) {
        setSummary(summaryResult.value.data || EMPTY_SUMMARY);
      }
    } finally {
      if (requestSeq === requestSeqRef.current) setLoading(false);
    }
  }, [activeFilter, pagination.pageNo, pagination.pageSize, refreshVersion, searchKeyword]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => void fetchList(),
      searchKeyword.trim() ? 300 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [fetchList, searchKeyword]);

  const handleRefresh = useCallback(() => {
    setRefreshVersion((value) => value + 1);
  }, []);

  const handleCreate = () => {
    if (!canCreate) return;
    modalRef.current?.open({
      operateType: DataSourceOperateType.Create,
      onSuccess: handleRefresh,
    });
  };

  const handleEdit = async (record: DataSourceRecord) => {
    if (!canUpdate || !record.id || editingId) return;
    const id = recordKey(record.id);
    try {
      setEditingId(id);
      const response = await fetchDataSourceDetail(record.id);
      if (response.code !== API_SUCCESS_CODE || !response.data) return;
      modalRef.current?.open({
        operateType: DataSourceOperateType.Edit,
        currentRecord: response.data,
        onSuccess: handleRefresh,
      });
    } finally {
      setEditingId('');
    }
  };

  const handleDelete = (record: DataSourceRecord) => {
    if (!canDelete) return;
    confirm({
      title: intl.formatMessage({
        id: 'pages.datasource.delete.confirmTitle',
        defaultMessage: '确认删除该数据源吗？',
      }),
      centered: true,
      content: (
        <span>
          即将删除数据源
          <span style={{ color: '#fe2c55', fontWeight: 600 }}>
            {' '}
            [{record.name}]
          </span>
          。
          <br />
          删除后无法恢复，请谨慎操作。
        </span>
      ),
      okText: '删除',
      cancelText: '取消',
      okType: 'primary',
      okButtonProps: { size: 'small', danger: true },
      cancelButtonProps: { size: 'small' },
      maskClosable: true,
      async onOk() {
        if (!record.id) {
          message.error('数据源 ID 不存在');
          return;
        }
        const response = await deleteDataSource(record.id);
        if (response.code !== API_SUCCESS_CODE) return;
        message.success(response.message || '删除成功');
        handleRefresh();
      },
    });
  };

  const handleTestConnection = async (record: DataSourceRecord) => {
    if (!canTest || !record.id || testingId) return;
    const id = recordKey(record.id);
    try {
      setTestingId(id);
      const response = await testDataSourceConnection(record.id);
      if (response.code !== API_SUCCESS_CODE) return;
      message.success('连接测试成功');
      handleRefresh();
    } finally {
      setTestingId('');
    }
  };

  const filterTabs = useMemo(
    () => [
      { key: 'all' as const, label: '全部数据源', count: summary.total },
      { key: 'connected' as const, label: '已连接', count: summary.connected },
      {
        key: 'disconnected' as const,
        label: '连接异常',
        count: summary.disconnected,
      },
      { key: 'unknown' as const, label: '待检测', count: summary.unknown },
    ],
    [summary],
  );

  const renderDataSourceCard = (record: DataSourceRecord) => {
    const environmentConfig =
      environmentTagConfigMap[record.environment || ''] || {
        text: record.environmentName || '未分类',
        color: '#667085',
        backgroundColor: '#f2f4f7',
        icon: null,
      };
    const connected = isConnectedStatus(record.connStatus);
    const disconnected = isDisconnectedStatus(record.connStatus);
    const currentId = recordKey(record.id);
    const actionAvailable = canTest || canUpdate || canDelete;

    return (
      <motion.article
        key={record.id}
        variants={PAGE_ANIMATION.fadeUp}
        className={[
          'datasource-item',
          viewMode === 'list' ? 'datasource-item--list' : '',
        ].join(' ')}
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
                <h3 title={record.name}>{record.name || '未命名数据源'}</h3>
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
                {record.jdbcUrl || '暂未配置连接地址'}
              </p>
            </div>
          </div>

          {actionAvailable && (
            <div className="datasource-item__quick-actions">
              {canTest && (
                <button
                  type="button"
                  title="测试连接"
                  disabled={Boolean(testingId)}
                  onClick={() => void handleTestConnection(record)}
                >
                  {testingId === currentId ? (
                    <RefreshCw className="is-spinning" size={15} />
                  ) : (
                    <Unplug size={15} strokeWidth={1.9} />
                  )}
                </button>
              )}
              {canUpdate && (
                <button
                  type="button"
                  title="编辑数据源"
                  disabled={Boolean(editingId)}
                  onClick={() => void handleEdit(record)}
                >
                  {editingId === currentId ? (
                    <RefreshCw className="is-spinning" size={15} />
                  ) : (
                    <Pencil size={15} strokeWidth={1.9} />
                  )}
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className="is-danger"
                  title="删除数据源"
                  onClick={() => handleDelete(record)}
                >
                  <Trash2 size={15} strokeWidth={1.9} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="datasource-item__details">
          <div className="datasource-detail-cell">
            <span>连接状态</span>
            <DataSourceStatus status={record.connStatus} />
          </div>
          <div className="datasource-detail-cell">
            <span>数据源类型</span>
            <strong>{String(record.dbType || '-')}</strong>
          </div>
          <div className="datasource-detail-cell">
            <span>最近更新</span>
            <strong>{record.updateTime || '-'}</strong>
          </div>
        </div>

        <div className="datasource-item__footer">
          <span
            className={[
              'datasource-connection-indicator',
              connected
                ? 'is-connected'
                : disconnected
                  ? 'is-disconnected'
                  : 'is-unknown',
            ].join(' ')}
          >
            {connected ? (
              <CheckCircle2 size={14} strokeWidth={2} />
            ) : disconnected ? (
              <XCircle size={14} strokeWidth={2} />
            ) : (
              <Unplug size={14} strokeWidth={2} />
            )}
            {connected
              ? '当前连接可用'
              : disconnected
                ? '当前连接不可用'
                : '等待连接检测'}
          </span>

          {canUpdate && (
            <button
              type="button"
              className="datasource-detail-button"
              disabled={Boolean(editingId)}
              onClick={() => void handleEdit(record)}
            >
              编辑详情
              <ChevronRight size={15} strokeWidth={2} />
            </button>
          )}
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

              {canCreate && (
                <button
                  type="button"
                  className="datasource-create-button"
                  onClick={handleCreate}
                >
                  <Plus size={17} strokeWidth={2.2} />
                  新建数据源
                </button>
              )}
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
                  <strong>{summary.total}</strong>
                </div>
              </div>
              <div className="datasource-overview__item">
                <span className="datasource-overview__icon is-success">
                  <CheckCircle2 size={20} strokeWidth={1.8} />
                </span>
                <div>
                  <span>连接正常</span>
                  <strong>{summary.connected}</strong>
                </div>
              </div>
              <div className="datasource-overview__item">
                <span className="datasource-overview__icon is-warning">
                  <XCircle size={20} strokeWidth={1.8} />
                </span>
                <div>
                  <span>连接异常</span>
                  <strong>{summary.disconnected}</strong>
                </div>
              </div>
              <div className="datasource-overview__item">
                <span className="datasource-overview__icon is-neutral">
                  <Server size={20} strokeWidth={1.8} />
                </span>
                <div>
                  <span>运行环境</span>
                  <strong>{summary.environmentCount}</strong>
                </div>
              </div>
            </motion.section>

            <motion.section
              variants={PAGE_ANIMATION.fadeUp}
              className="datasource-workbench"
            >
              <div className="datasource-workbench__tabs">
                {filterTabs.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={activeFilter === item.key ? 'is-active' : ''}
                    onClick={() => {
                      setActiveFilter(item.key);
                      setPagination((current) => ({ ...current, pageNo: 1 }));
                    }}
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
                    onChange={(event) => {
                      setSearchKeyword(event.target.value);
                      setPagination((current) => ({ ...current, pageNo: 1 }));
                    }}
                    placeholder="搜索数据源名称或连接地址"
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      aria-label="清空搜索"
                      onClick={() => {
                        setSearchKeyword('');
                        setPagination((current) => ({ ...current, pageNo: 1 }));
                      }}
                    >
                      ×
                    </button>
                  )}
                </label>

                <button
                  type="button"
                  className="datasource-tool-button"
                  title="刷新"
                  disabled={loading}
                  onClick={handleRefresh}
                >
                  <RefreshCw
                    size={16}
                    strokeWidth={1.8}
                    className={loading ? 'is-spinning' : ''}
                  />
                </button>

                <div className="datasource-view-switch">
                  <button
                    type="button"
                    className={viewMode === 'grid' ? 'is-active' : ''}
                    title="卡片视图"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid2X2 size={16} strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'list' ? 'is-active' : ''}
                    title="列表视图"
                    onClick={() => setViewMode('list')}
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
              <strong>{pagination.total}</strong>
              个数据源
            </motion.div>

            <Spin spinning={loading}>
              <motion.section
                variants={PAGE_ANIMATION.cardStagger}
                initial="hidden"
                animate="visible"
                className={[
                  'datasource-list',
                  viewMode === 'list' ? 'datasource-list--list' : '',
                ].join(' ')}
              >
                {dataSourceList.map(renderDataSourceCard)}
              </motion.section>

              {!loading && dataSourceList.length === 0 && (
                <div className="datasource-empty">
                  <div className="datasource-empty__icon">
                    <Database size={36} strokeWidth={1.5} />
                    <Plus size={17} strokeWidth={2.2} />
                  </div>
                  <h3>
                    {searchKeyword || activeFilter !== 'all'
                      ? '没有找到符合条件的数据源'
                      : '还没有创建数据源'}
                  </h3>
                  <p>
                    {searchKeyword || activeFilter !== 'all'
                      ? '可以调整搜索关键词或切换筛选条件后重试。'
                      : '创建第一个数据源，开始配置数据同步与运行任务。'}
                  </p>
                  {canCreate && !searchKeyword && activeFilter === 'all' && (
                    <button type="button" onClick={handleCreate}>
                      <Plus size={16} strokeWidth={2.2} />
                      新建数据源
                    </button>
                  )}
                </div>
              )}
            </Spin>

            {pagination.total > 0 && (
              <div className="datasource-pagination">
                <Pagination
                  current={pagination.pageNo}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  showSizeChanger
                  showQuickJumper
                  pageSizeOptions={[10, 20, 50, 100]}
                  disabled={loading}
                  showTotal={(total, range) =>
                    `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                  }
                  onChange={(pageNo, pageSize) =>
                    setPagination((current) => ({
                      ...current,
                      pageNo,
                      pageSize,
                    }))
                  }
                />
              </div>
            )}
          </motion.div>
        </div>
      </ClickSpark>

      <AddOrEditDataSourceModal ref={modalRef} />
    </>
  );
};

export default DataSourcePage;
