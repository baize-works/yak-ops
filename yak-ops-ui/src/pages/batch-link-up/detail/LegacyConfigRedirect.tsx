import { history, useLocation, useParams } from '@umijs/max';
import { Spin } from 'antd';
import { useEffect, useMemo } from 'react';

export default function LegacyConfigRedirect() {
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const taskId = useMemo(() => {
    const queryId = new URLSearchParams(location.search).get('id');
    if (queryId) return queryId;
    if (params.id) return params.id;

    const lastSegment = location.pathname.split('/').filter(Boolean).pop();
    return lastSegment && !['single', 'multi'].includes(lastSegment)
      ? lastSegment
      : '';
  }, [location.pathname, location.search, params.id]);

  useEffect(() => {
    if (taskId) {
      history.replace(
        `/sync/batch-link-up/${encodeURIComponent(taskId)}/detail?scene=edit`,
      );
      return;
    }
    history.replace('/sync/batch-link-up');
  }, [taskId]);

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f8fafc]">
      <Spin />
    </div>
  );
}
