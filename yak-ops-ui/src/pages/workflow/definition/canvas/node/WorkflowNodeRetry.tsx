import type { WorkflowNodeData } from '../types';

interface WorkflowNodeRetryProps {
  data: WorkflowNodeData;
}

const WorkflowNodeRetry = ({ data }: WorkflowNodeRetryProps) => {
  const retryTimes = Math.max(0, (data.maxAttempts || 1) - 1);

  if (!retryTimes) return null;

  return (
    <div className="mt-2 rounded-md bg-[#f3f4f6] px-2 py-1 text-[11px] font-medium leading-4 text-[#667085]">
      失败时重试 {retryTimes} 次
    </div>
  );
};

export default WorkflowNodeRetry;
