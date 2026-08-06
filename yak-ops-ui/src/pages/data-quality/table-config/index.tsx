import { fetchDataSourceAll } from '@/pages/data-source/service';
import { API_SUCCESS_CODE } from '@/services/http/response';
import { BRAND_THEME } from '@/styles/brand';
import { history } from '@umijs/max';
import { Button, ConfigProvider, Drawer, Empty, Input, Pagination, Popconfirm, Spin, Table, Tooltip, Tree, message, type TreeProps, } from 'antd';
import { ChevronLeft, ChevronRight, Database, Play, Plus, RefreshCw, Search, Settings2, X, } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckResultTag } from '../components/QualityStatus';
import { qualityMonitorApi, qualityTableAssetApi } from '../service';
import type { TableAssetView, TableCandidateView } from '../types';
const PAGE_SIZE = 20;
interface SourceNode { key: string;
id: number;
name: string;
type: string;
}
const unwrap = <T,>(response: { code: number;
data: T;
message?: string;
msg?: string;
}) => { if (response.code !== API_SUCCESS_CODE) { throw new Error(response.message || response.msg || '请求失败');
} return response.data;
};
const sourceKey = (id: number) => `data-source:${id}`;
const tableKey = (record: TableCandidateView) => [record.databaseName || '', record.schemaName || '', record.tableName].join(String.fromCharCode(1));
const TableConfigPage = () => { const [sourceNodes, setSourceNodes] = useState<SourceNode[]>([]);
const [selectedKey, setSelectedKey] = useState<string>();
const [sourceLoading, setSourceLoading] = useState(false);
const [collapsed, setCollapsed] = useState(false);
const [assets, setAssets] = useState<TableAssetView[]>([]);
const [assetTotal, setAssetTotal] = useState(0);
const [assetCurrent, setAssetCurrent] = useState(1);
const [assetKeyword, setAssetKeyword] = useState('');
const [assetQuery, setAssetQuery] = useState('');
const [assetLoading, setAssetLoading] = useState(false);
const [drawerOpen, setDrawerOpen] = useState(false);
const [candidates, setCandidates] = useState<TableCandidateView[]>([]);
const [candidateTotal, setCandidateTotal] = useState(0);
const [candidateCurrent, setCandidateCurrent] = useState(1);
const [candidateKeyword, setCandidateKeyword] = useState('');
const [candidateQuery, setCandidateQuery] = useState('');
const [candidateLoading, setCandidateLoading] = useState(false);
const [registering, setRegistering] = useState(false);
const [selectedCandidates, setSelectedCandidates] = useState< Map<string, TableCandidateView> >(new Map());
const selectedSource = useMemo( () => sourceNodes.find((item) => item.key === selectedKey), [selectedKey, sourceNodes], );
const selectedCandidateKeys = useMemo( () => Array.from(selectedCandidates.keys()), [selectedCandidates], );
const selectedCandidateRecords = useMemo( () => Array.from(selectedCandidates.values()), [selectedCandidates], );
const treeData = useMemo<NonNullable<TreeProps['treeData']>>(() => { const groups = new Map<string, SourceNode[]>();
sourceNodes.forEach((source) => { const records = groups.get(source.type) || [];
records.push(source);
groups.set(source.type, records);
});
return Array.from(groups.entries()) .sort(([left], [right]) => left.localeCompare(right)) .map(([type, records]) => ({ key: `type:${type}`, selectable: false, title: ( <div className='flex min-w-0 flex-1 items-center gap-2 pr-1 text-[13px] font-semibold text-[#30323b]'>
<Database size={14} className='shrink-0 text-[#667085]' />
<span className='min-w-0 flex-1 truncate'>{type}</span>
<span className='text-xs font-normal text-[#98a2b3]'> {records.length} </span>
</div> ), children: [...records] .sort((left, right) => left.name.localeCompare(right.name)) .map((source) => ({ key: source.key, title: ( <div className={`flex min-w-0 flex-1 items-center gap-2 text-[13px] ${ source.key === selectedKey ? 'font-medium text-[#fe2c55]' : 'text-[#30323b]' }`} >
<span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ source.key === selectedKey ? 'bg-[#fe2c55]' : 'bg-[#c6c9d0]' }`} />
<span className='truncate'>{source.name}</span>
</div> ), })), }));
}, [selectedKey, sourceNodes]);
const loadSources = useCallback(async (preferredKey?: string) => { setSourceLoading(true);
try { const result = unwrap(await fetchDataSourceAll());
const nodes = (result.bizData || []) .filter((record) => Number(record.id) > 0) .map((record) => { const id = Number(record.id);
return { key: sourceKey(id), id, name: record.name || `数据源 ${id}`, type: record.dbType?.trim().toUpperCase() || 'OTHER', } satisfies SourceNode;
});
setSourceNodes(nodes);
const selected = nodes.find((item) => item.key === preferredKey) || nodes[0];
setSelectedKey(selected?.key);
return selected;
} catch (error: any) { setSourceNodes([]);
setSelectedKey(undefined);
message.error(error?.message || '数据源加载失败');
return undefined;
} finally { setSourceLoading(false);
} }, []);
const loadAssets = useCallback( async (dataSourceId: number, current: number, keyword: string) => { setAssetLoading(true);
try { const result = unwrap( await qualityTableAssetApi.page({ current, pageSize: PAGE_SIZE, dataSourceId, keyword, }), );
setAssets(result.records || []);
setAssetTotal(result.total || 0);
} catch (error: any) { setAssets([]);
setAssetTotal(0);
message.error(error?.message || '已注册数据表加载失败');
} finally { setAssetLoading(false);
} }, [], );
const loadCandidates = useCallback( async (dataSourceId: number, current: number, keyword: string) => { setCandidateLoading(true);
try { const result = unwrap( await qualityTableAssetApi.candidates({ dataSourceId, current, pageSize: PAGE_SIZE, keyword, }), );
setCandidates(result.records || []);
setCandidateTotal(result.total || 0);
} catch (error: any) { setCandidates([]);
setCandidateTotal(0);
message.error(error?.message || '可注册数据表加载失败');
} finally { setCandidateLoading(false);
} }, [], );
useEffect(() => void loadSources(), [loadSources]);
useEffect(() => { const timer = window.setTimeout( () => setAssetQuery(assetKeyword.trim()), 250, );
return () => window.clearTimeout(timer);
}, [assetKeyword]);
useEffect(() => { const timer = window.setTimeout( () => setCandidateQuery(candidateKeyword.trim()), 250, );
return () => window.clearTimeout(timer);
}, [candidateKeyword]);
useEffect(() => { if (!selectedSource) { setAssets([]);
setAssetTotal(0);
return;
} void loadAssets(selectedSource.id, assetCurrent, assetQuery);
}, [assetCurrent, assetQuery, loadAssets, selectedSource]);
useEffect(() => { if (!drawerOpen || !selectedSource) return;
void loadCandidates( selectedSource.id, candidateCurrent, candidateQuery, );
}, [ candidateCurrent, candidateQuery, drawerOpen, loadCandidates, selectedSource, ]);
const selectSource: TreeProps['onSelect'] = (keys) => { const key = String(keys[0] || '');
if (!sourceNodes.some((item) => item.key === key)) return;
setSelectedKey(key);
setAssetCurrent(1);
setAssetKeyword('');
setAssetQuery('');
setDrawerOpen(false);
setSelectedCandidates(new Map());
};
const refresh = async () => { const source = await loadSources(selectedKey);
if (source) { await loadAssets(source.id, assetCurrent, assetQuery);
} };
const openDrawer = () => { if (!selectedSource) { message.warning('请先从左侧选择数据源');
return;
} setSelectedCandidates(new Map());
setCandidateKeyword('');
setCandidateQuery('');
setCandidateCurrent(1);
setDrawerOpen(true);
};
const changeSelection = ( record: TableCandidateView, selected: boolean, ) => { setSelectedCandidates((previous) => { const next = new Map(previous);
selected ? next.set(tableKey(record), record) : next.delete(tableKey(record));
return next;
});
};
const registerTables = async () => { if (!selectedSource || !selectedCandidates.size) { message.warning('请至少选择一张数据表');
return;
} setRegistering(true);
try { const result = unwrap( await qualityTableAssetApi.register({ dataSourceId: selectedSource.id, dataSourceName: selectedSource.name, tables: selectedCandidateRecords.map((record) => ({ databaseName: record.databaseName, schemaName: record.schemaName, tableName: record.tableName, tableType: record.tableType, remarks: record.remarks, })), }), );
message.success(`已注册 ${result.registered} 张数据表`);
setDrawerOpen(false);
setSelectedCandidates(new Map());
setAssetCurrent(1);
await loadAssets(selectedSource.id, 1, assetQuery);
} catch (error: any) { message.error(error?.message || '数据表注册失败');
} finally { setRegistering(false);
} };
const unregisterTable = async (record: TableAssetView) => { try { unwrap(await qualityTableAssetApi.remove(record.id));
message.success('已取消注册');
if (assets.length === 1 && assetCurrent > 1) { setAssetCurrent((value) => value - 1);
} else if (selectedSource) { await loadAssets(selectedSource.id, assetCurrent, assetQuery);
} } catch (error: any) { message.error(error?.message || '取消注册失败');
} };
const monitorQuery = (record: TableAssetView) => new URLSearchParams({ dataSourceId: String(record.dataSourceId), dataSourceName: record.dataSourceName, databaseName: record.databaseName || '', schemaName: record.schemaName || '', tableName: record.tableName, }).toString();
return ( <ConfigProvider theme={BRAND_THEME}>
<div className='flex h-[calc(100vh-64px)] min-h-[620px] flex-col overflow-hidden bg-white'>
<div className='flex h-12 shrink-0 items-center justify-between border-b border-[#e8e9ec] px-5'>
<h1 className='m-0 text-[20px] font-semibold text-[#161823]'> 按表配置 </h1>
<Button icon={<RefreshCw size={14} />} loading={sourceLoading || assetLoading} onClick={refresh} > 刷新 </Button>
</div>
<div className='flex min-h-0 flex-1 overflow-hidden'>
<aside className='shrink-0 overflow-hidden bg-white transition-[width]' style={{ width: collapsed ? 0 : 280 }} >
<div className='h-full w-[280px] overflow-y-auto px-4 py-3'>
<div className='mb-2 text-xs font-semibold text-[#161823]'> 数据源 </div>
<Spin spinning={sourceLoading}> {treeData.length ? ( <Tree blockNode defaultExpandAll selectedKeys={selectedKey ? [selectedKey] : []} treeData={treeData} onSelect={selectSource} className='bg-transparent text-[13px] [&_.ant-tree-node-content-wrapper]:min-w-0 [&_.ant-tree-node-content-wrapper]:!rounded-none [&_.ant-tree-node-selected]:!bg-[rgba(254,44,85,.08)] [&_.ant-tree-switcher]:text-[#98a2b3]' /> ) : ( <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无已配置的数据源' className='mt-12' /> )} </Spin>
</div>
</aside>
<div className='relative w-3 shrink-0'>
<div className='absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#e4e7ec]' />
<button type='button' onClick={() => setCollapsed((value) => !value)} className='absolute left-1/2 top-1/2 z-20 flex h-8 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded border border-[#dfe1e5] bg-white text-[#7b808a]' > {collapsed ? ( <ChevronRight size={13} /> ) : ( <ChevronLeft size={13} /> )} </button>
</div>
<main className='min-w-0 flex-1 overflow-hidden px-4 py-3'>
<div className='flex h-full flex-col overflow-hidden'>
<div className='mb-3 flex shrink-0 items-center gap-2'> {selectedSource && ( <div className='flex h-8 shrink-0 items-center gap-3 bg-[#f5f5f6] px-3 text-xs text-[#667085]'>
<span> 数据源类型： <strong className='font-medium text-[#30323b]'> {selectedSource.type} </strong>
</span>
<span className='h-3 w-px bg-[#dfe1e5]' />
<span> 数据源： <strong className='font-medium text-[#30323b]'> {selectedSource.name} </strong>
</span>
</div> )} <Input allowClear variant='filled' value={assetKeyword} onChange={(event) => { setAssetKeyword(event.target.value);
setAssetCurrent(1);
}} prefix={<Search size={14} className='text-[#98a2b3]' />} placeholder='搜索已注册的表名或描述' className='min-w-[260px] flex-1' />
<Button type='primary' icon={<Plus size={14} />} disabled={!selectedSource} onClick={openDrawer} > 注册数据表 </Button>
</div> {!selectedSource ? ( <div className='flex min-h-0 flex-1 items-center justify-center'>
<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='请从左侧选择数据源' />
</div> ) : ( <Spin spinning={assetLoading} wrapperClassName='min-h-0 flex-1' >
<div className='flex h-full min-h-0 flex-col'>
<div className='min-h-0 flex-1 overflow-auto'>
<Table<TableAssetView> rowKey='id' size='small' pagination={false} dataSource={assets} scroll={{ x: 1080 }} locale={{ emptyText: ( <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='当前数据源还没有注册数据表' >
<Button type='primary' icon={<Plus size={14} />} onClick={openDrawer} > 注册数据表 </Button>
</Empty> ), }} columns={[ { title: '表名/描述/路径', dataIndex: 'tableName', render: (_, record) => ( <div>
<div className='font-medium text-[#161823]'> {record.tableName} </div> {record.remarks && ( <div className='mt-0.5 text-xs text-[#8a8f99]'> {record.remarks} </div> )} <div className='mt-0.5 text-xs text-[#98a2b3]'> {[ record.databaseName, record.schemaName, record.tableName, ] .filter(Boolean) .join(' / ')} </div>
</div> ), }, { title: '监控数', dataIndex: 'monitorCount', width: 100, }, { title: '规则数', dataIndex: 'ruleCount', width: 100, }, { title: '最近结果', dataIndex: 'lastResult', width: 120, render: (value) => ( <CheckResultTag value={value} /> ), }, { title: '最近运行', dataIndex: 'lastRunTime', width: 180, render: (value) => value || '--', }, { title: '操作', width: 300, fixed: 'right', render: (_, record) => ( <div className='flex items-center gap-1'> {record.monitorId ? ( <>
<Button type='link' size='small' icon={<Settings2 size={13} />} onClick={() => history.push( `/data-quality/monitor/${record.monitorId}`, ) } > 监控详情 </Button>
<Tooltip title='手动运行'>
<Button type='text' size='small' icon={<Play size={14} />} onClick={async () => { try { unwrap( await qualityMonitorApi.run( record.monitorId!, ), );
message.success('质量检查已提交');
await loadAssets( selectedSource.id, assetCurrent, assetQuery, );
} catch (error: any) { message.error( error?.message || '运行失败', );
} }} />
</Tooltip>
</> ) : ( <Button type='link' size='small' onClick={() => history.push( `/data-quality/monitor/create?${monitorQuery( record, )}`, ) } > 新建质量监控 </Button> )} {record.monitorCount > 0 ? ( <Tooltip title='请先删除该表的质量监控'>
<span>
<Button type='text' size='small' disabled > 取消注册 </Button>
</span>
</Tooltip> ) : ( <Popconfirm title='取消注册数据表' description='取消后，该表将不再出现在按表配置列表中。' okText='确认取消' cancelText='保留' onConfirm={() => unregisterTable(record) } >
<Button type='text' size='small'> 取消注册 </Button>
</Popconfirm> )} </div> ), }, ]} />
</div> {assetTotal > 0 && ( <div className='flex shrink-0 justify-end border-t border-[#f0f0f1] px-3 py-3'>
<Pagination size='small' current={assetCurrent} pageSize={PAGE_SIZE} total={assetTotal} showSizeChanger={false} showTotal={(total) => `共 ${total} 张已注册表`} onChange={setAssetCurrent} />
</div> )} </div>
</Spin> )} </div>
</main>
</div>
</div>
<Drawer title={ <div>
<div className='text-[16px] font-semibold text-[#161823]'> 注册数据表 </div>
<div className='mt-1 text-xs font-normal text-[#8a8f99]'> 从当前数据源发现表，并将需要质量管理的数据表注册到按表配置。 </div>
</div> } width={960} open={drawerOpen} destroyOnClose maskClosable={!registering} closable={!registering} onClose={() => { if (!registering) { setDrawerOpen(false);
setSelectedCandidates(new Map());
} }} styles={{ body: { padding: 0 }, footer: { padding: '12px 20px' } }} footer={ <div className='flex items-center justify-between'>
<span className='text-xs text-[#8a8f99]'> 已选择 {selectedCandidates.size} 张数据表 </span>
<div className='flex items-center gap-2'>
<Button disabled={registering} onClick={() => setDrawerOpen(false)} > 取消 </Button>
<Button type='primary' loading={registering} disabled={!selectedCandidates.size} onClick={registerTables} > 注册所选数据表 </Button>
</div>
</div> } >
<div className='grid h-full min-h-[580px] grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]'>
<div className='flex min-w-0 flex-col border-r border-[#e8e9ec] p-4'>
<div className='mb-3 flex items-center justify-between'>
<div>
<div className='text-sm font-semibold text-[#161823]'> 可注册的数据表 </div>
<div className='mt-0.5 text-xs text-[#98a2b3]'> 数据实时来自当前数据源 </div>
</div>
<span className='text-xs text-[#8a8f99]'> 共 {candidateTotal} 张 </span>
</div>
<Input allowClear variant='filled' value={candidateKeyword} onChange={(event) => { setCandidateKeyword(event.target.value);
setCandidateCurrent(1);
}} prefix={<Search size={14} className='text-[#98a2b3]' />} placeholder='搜索表名或描述' className='mb-3' />
<div className='min-h-0 flex-1 overflow-hidden'>
<Spin spinning={candidateLoading}>
<Table<TableCandidateView> rowKey={tableKey} size='small' pagination={false} dataSource={candidates} scroll={{ y: 410 }} rowSelection={{ preserveSelectedRowKeys: true, selectedRowKeys: selectedCandidateKeys, onSelect: changeSelection, onSelectAll: (selected, _rows, changedRows) => { setSelectedCandidates((previous) => { const next = new Map(previous);
changedRows.forEach((record) => { selected ? next.set(tableKey(record), record) : next.delete(tableKey(record));
});
return next;
});
}, }} locale={{ emptyText: ( <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='没有可注册的数据表' /> ), }} columns={[ { title: '表名/描述', dataIndex: 'tableName', render: (_, record) => ( <div className='min-w-0'>
<div className='truncate font-medium text-[#161823]'> {record.tableName} </div> {record.remarks && ( <div className='mt-0.5 truncate text-xs text-[#8a8f99]'> {record.remarks} </div> )} <div className='mt-0.5 truncate text-xs text-[#98a2b3]'> {[ record.databaseName, record.schemaName, record.tableName, ] .filter(Boolean) .join(' / ')} </div>
</div> ), }, { title: '类型', dataIndex: 'tableType', width: 90, render: (value) => value || '--', }, ]} />
</Spin>
</div> {candidateTotal > 0 && ( <div className='mt-3 flex shrink-0 justify-end'>
<Pagination size='small' current={candidateCurrent} pageSize={PAGE_SIZE} total={candidateTotal} showSizeChanger={false} onChange={setCandidateCurrent} />
</div> )} </div>
<div className='flex min-w-0 flex-col bg-[#fafafa] p-4'>
<div className='mb-3 flex items-center justify-between'>
<div>
<div className='text-sm font-semibold text-[#161823]'> 已选择的数据表 </div>
<div className='mt-0.5 text-xs text-[#98a2b3]'> 支持跨页选择，确认后统一注册 </div>
</div> {!!selectedCandidates.size && ( <Button type='link' size='small' onClick={() => setSelectedCandidates(new Map())} > 清空 </Button> )} </div>
<div className='min-h-0 flex-1 overflow-y-auto'> {selectedCandidateRecords.length ? ( <div className='space-y-2'> {selectedCandidateRecords.map((record) => ( <div key={tableKey(record)} className='flex items-start gap-2 border border-[#e4e7ec] bg-white px-3 py-2.5' >
<Database size={14} className='mt-0.5 shrink-0 text-[#667085]' />
<div className='min-w-0 flex-1'>
<div className='truncate text-[13px] font-medium text-[#161823]'> {record.tableName} </div>
<div className='mt-0.5 truncate text-xs text-[#98a2b3]'> {[ record.databaseName, record.schemaName, record.tableName, ] .filter(Boolean) .join(' / ')} </div>
</div>
<Button type='text' size='small' aria-label={`移除 ${record.tableName}`} icon={<X size={14} />} onClick={() => changeSelection(record, false)} />
</div> ))} </div> ) : ( <div className='flex h-full items-center justify-center'>
<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='尚未选择数据表' />
</div> )} </div>
</div>
</div>
</Drawer>
</ConfigProvider> );
};
export default TableConfigPage;
