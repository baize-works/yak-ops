import { BRAND_THEME } from '@/styles/brand';
import type { TreeProps } from 'antd';
import { Button, ConfigProvider } from 'antd';
import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import DataSourceTreePane from './components/DataSourceTreePane';
import RegisteredTablePanel from './components/RegisteredTablePanel';
import RegisterTableDrawer from './components/RegisterTableDrawer';
import { useDataSourceTree } from './hooks/useDataSourceTree';
import { useTableAssets } from './hooks/useTableAssets';

const TableConfigPage = () => {
  const source = useDataSourceTree();
  const table = useTableAssets({
    dataSourceId: source.dataSourceId,
    selectedDataSource: source.selectedDataSource,
    selectedSourceNode: source.selectedSourceNode,
  });

  useEffect(() => {
    void source.loadSourceTree();
  }, [source.loadSourceTree]);

  const handleTreeSelect: TreeProps['onSelect'] = (keys) => {
    const key = String(keys[0] || '');
    const selected = source.selectNode(key);
    if (selected) table.resetForDataSource();
  };

  const refreshPage = async () => {
    const selected = await source.loadSourceTree(source.selectedNodeKey);
    if (selected) {
      await table.requestAssets(
        selected.dataSourceId,
        table.assetCurrent,
        table.queryKeyword,
      );
    }
  };

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div className="flex h-[calc(100vh-64px)] min-h-[620px] flex-col overflow-hidden bg-white">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e8e9ec] px-5">
          <h1 className="m-0 text-[20px] font-semibold text-[#161823]">
            数据表监控
          </h1>
          <Button
            icon={<RefreshCw size={14} />}
            loading={table.assetLoading || source.treeLoading}
            onClick={refreshPage}
          >
            刷新
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <DataSourceTreePane
            treeData={source.treeData}
            treeLoading={source.treeLoading}
            selectedNodeKey={source.selectedNodeKey}
            leftWidth={source.leftWidth}
            collapsed={source.collapsed}
            onSelect={handleTreeSelect}
            onResizeStart={source.startResize}
            onCollapsedChange={source.setCollapsed}
          />

          <RegisteredTablePanel
            dataSourceId={source.dataSourceId}
            selectedSourceNode={source.selectedSourceNode}
            assets={table.assets}
            assetTotal={table.assetTotal}
            assetCurrent={table.assetCurrent}
            keyword={table.keyword}
            assetLoading={table.assetLoading}
            onAssetCurrentChange={table.setAssetCurrent}
            onKeywordChange={(keyword) => {
              table.setKeyword(keyword);
              table.setAssetCurrent(1);
            }}
            onOpenRegister={table.openRegisterDrawer}
            onOpenRuleManagement={table.openMonitorDetail}
            onCreateMonitor={table.createMonitor}
          />
        </div>
      </div>

      <RegisterTableDrawer
        open={table.registerOpen}
        registering={table.registering}
        candidates={table.candidates}
        candidateTotal={table.candidateTotal}
        candidateCurrent={table.candidateCurrent}
        candidateKeyword={table.candidateKeyword}
        candidateLoading={table.candidateLoading}
        selectedCandidates={table.selectedCandidates}
        selectedCandidateKeys={table.selectedCandidateKeys}
        selectedCandidateRecords={table.selectedCandidateRecords}
        onClose={table.closeRegisterDrawer}
        onRegister={table.handleRegister}
        onCandidateCurrentChange={table.setCandidateCurrent}
        onCandidateKeywordChange={(keyword) => {
          table.setCandidateKeyword(keyword);
          table.setCandidateCurrent(1);
        }}
        onSelect={table.updateCandidateSelection}
        onSelectAll={table.updateAllCandidateSelection}
        onClear={table.clearCandidateSelection}
      />
    </ConfigProvider>
  );
};

export default TableConfigPage;
