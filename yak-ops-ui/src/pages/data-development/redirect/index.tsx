import { history } from '@umijs/max';
import { useEffect } from 'react';

const DataDevelopmentRedirectPage = () => {
  useEffect(() => {
    history.replace('/data-development/workbench');
  }, []);

  return null;
};

export default DataDevelopmentRedirectPage;
