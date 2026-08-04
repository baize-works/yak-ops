import { BRAND_CSS_VARIABLES, BRAND_THEME } from '@/styles/brand';
import { history, useParams } from '@umijs/max';
import { Button, ConfigProvider, Result, Spin } from 'antd';
import { useEffect, useState } from 'react';

import { workflowV2Repository } from '../workflow-v2.repository';

const WorkflowDesignerRouterPage = () => {
  const params = useParams<{ id: string }>();
  const workflowId = params.id || '';
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    const route = async () => {
      if (!workflowId) {
        setError('缺少工作流 ID');
        return;
      }
      if (workflowId === 'create') {
        history.replace('/workflow-management/v2/create/designer');
        return;
      }
      try {
        const response = await workflowV2Repository.detail(workflowId);
        if (!active) return;
        if (response.code !== 200 || !response.data) {
          setError(response.message || '工作流不存在或无法读取');
          return;
        }
        history.replace(
          response.data.schemaVersion === 2
            ? `/workflow-management/v2/${workflowId}/designer`
            : `/workflow-management/v1/${workflowId}/designer`,
        );
      } catch (reason) {
        if (!active) return;
        setError(
          reason instanceof Error ? reason.message : '工作流路由解析失败',
        );
      }
    };
    void route();
    return () => {
      active = false;
    };
  }, [workflowId]);

  return (
    <ConfigProvider theme={BRAND_THEME}>
      <div
        style={BRAND_CSS_VARIABLES}
        className="fixed inset-0 z-[130] flex items-center justify-center bg-[#f7f7f8]"
      >
        {error ? (
          <Result
            status="error"
            title="无法打开工作流"
            subTitle={error}
            extra={
              <Button
                type="primary"
                onClick={() => history.replace('/workflow-management')}
              >
                返回工作流列表
              </Button>
            }
          />
        ) : (
          <Spin tip="正在识别工作流版本..." />
        )}
      </div>
    </ConfigProvider>
  );
};

export default WorkflowDesignerRouterPage;
