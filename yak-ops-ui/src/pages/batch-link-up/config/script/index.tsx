import { history } from '@umijs/max';
import { useEffect } from 'react';

export default function DeprecatedScriptConfigPage() {
  useEffect(() => {
    history.replace('/sync/batch-link-up');
  }, []);

  return null;
}
