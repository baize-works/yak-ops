import { history, useLocation } from '@umijs/max';
import { Empty, Button } from 'antd';
import MultiConfigPage from './MultiConfigPage';
import SingleConfigPage from './SingleConfigPage';
import YamlConfigPage from './YamlConfigPage';

const RealtimeConfigPage = () => {
  const location = useLocation();
  const mode = new URLSearchParams(location.search).get('mode');

  if (mode === 'single') return <SingleConfigPage />;
  if (mode === 'multi') return <MultiConfigPage />;
  if (mode === 'yaml') return <YamlConfigPage />;

  return (
    <div className="flex min-h-[calc(100vh-48px)] items-center justify-center bg-[#f7f8fa]">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="未识别实时同步配置模式"
      >
        <Button type="primary" onClick={() => history.push('/sync/realtime-link-up')}>
          返回任务列表
        </Button>
      </Empty>
    </div>
  );
};

export default RealtimeConfigPage;
