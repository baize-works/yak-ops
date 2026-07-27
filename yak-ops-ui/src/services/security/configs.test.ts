import { sanitizeConfigInput, type ConfigInput } from './configs';

const input = (configValue?: string): ConfigInput => ({
  configKey: 'secret', configName: 'Secret', groupCode: 'security', valueType: 'STRING',
  status: 'ENABLED', sensitive: true, configValue,
});

describe('sanitizeConfigInput', () => {
  it.each([undefined, '', '   ', '******', '••••'])('never resubmits an empty or masked secret (%p)', (value) => {
    expect(sanitizeConfigInput(input(value), true)).not.toHaveProperty('configValue');
  });
  it('keeps a newly entered value', () => {
    expect(sanitizeConfigInput(input('new-secret'), true).configValue).toBe('new-secret');
  });
});
