import { getConfigInitialValues, transformRules } from './formUtils';

describe('dynamic data source form utils', () => {
  it('marks number field rules as numeric validation rules', () => {
    expect(
      transformRules(
        [
          {
            required: true,
            min: 1,
            max: 65535,
            message: '端口必须在 1 到 65535 之间',
          },
        ],
        'NUMBER',
      ),
    ).toEqual([
      {
        type: 'number',
        required: true,
        min: 1,
        max: 65535,
        message: '端口必须在 1 到 65535 之间',
      },
    ]);
  });

  it('keeps text field length rules as non-numeric rules', () => {
    expect(
      transformRules([{ max: 10, message: '最多输入 10 个字符' }], 'INPUT'),
    ).toEqual([{ max: 10, message: '最多输入 10 个字符' }]);
  });

  it('parses number defaults into numbers', () => {
    expect(
      getConfigInitialValues([
        {
          key: 'port',
          label: '端口',
          type: 'NUMBER',
          defaultValue: '3306',
        },
      ]),
    ).toEqual({ port: 3306 });
  });
});
