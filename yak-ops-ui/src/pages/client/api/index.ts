/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const apiPrefix = '/api/v1/datax/executor';

function getApi(path: string) {
  return `${apiPrefix}${path}`;
}

const api = {
  // 数据源
  executorPage: getApi('/page'),
  executorCount: getApi('/count'),
};

export default api;
