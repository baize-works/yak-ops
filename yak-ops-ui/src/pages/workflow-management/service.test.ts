import { normalizeWorkflowResponse } from './service';

describe('workflow response adapter', () => {
  it('preserves the framework success code', () => {
    expect(
      normalizeWorkflowResponse({
        code: 200,
        data: [{ id: 1 }],
        message: '成功',
      }),
    ).toEqual({
      code: 200,
      data: [{ id: 1 }],
      message: '成功',
    });
  });

  it('preserves failures and supports the msg envelope field', () => {
    expect(
      normalizeWorkflowResponse({
        code: 999,
        data: null,
        msg: '加载失败',
      }),
    ).toEqual({
      code: 999,
      data: null,
      message: '加载失败',
    });
  });
});
