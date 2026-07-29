import { normalizeCreateValues } from './index';

describe('workflow create guide values', () => {
  it('normalizes the first-step values before the form is unmounted', () => {
    expect(
      normalizeCreateValues({
        name: '  实时同步工作流  ',
        code: '  realtime-sync  ',
        description: '  MySQL CDC  ',
        failureStrategy: 'CONTINUE',
        maxParallelism: 8,
      }),
    ).toEqual({
      name: '实时同步工作流',
      code: 'realtime-sync',
      description: 'MySQL CDC',
      failureStrategy: 'CONTINUE',
      maxParallelism: 8,
    });
  });

  it('does not build submission values when required form fields are missing', () => {
    expect(normalizeCreateValues({ code: 'realtime-sync' })).toBeUndefined();
    expect(normalizeCreateValues({ name: '实时同步工作流' })).toBeUndefined();
  });
});
