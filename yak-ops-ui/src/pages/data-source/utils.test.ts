import { buildSubmitPayload, parseOriginalJson } from './utils';

describe('datasource utils', () => {
  it('builds the backend connection parameter contract', () => {
    const payload = buildSubmitPayload(
      'MYSQL',
      {
        name: '业务库',
        environment: 'PROD',
        remark: '核心业务',
      },
      {
        host: '127.0.0.1',
        port: 3306,
        password: '******',
      },
    );

    expect(payload).toEqual({
      name: '业务库',
      environment: 'PROD',
      remark: '核心业务',
      dbType: 'MYSQL',
      connectionParams: JSON.stringify({
        host: '127.0.0.1',
        port: 3306,
        password: '******',
        dbType: 'MYSQL',
      }),
    });
  });

  it('returns a stable parsed config for the same detail response', () => {
    const originalJson = '{"host":"db","password":"******"}';

    const first = parseOriginalJson(originalJson);
    const second = parseOriginalJson(originalJson);

    expect(second).toBe(first);
    expect(second).toEqual({ host: 'db', password: '******' });
  });

  it('returns an empty object for malformed detail JSON', () => {
    expect(parseOriginalJson('{broken')).toEqual({});
  });
});
