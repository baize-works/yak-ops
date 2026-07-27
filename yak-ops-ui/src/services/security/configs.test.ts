import { formatConfigValue } from './configs';

describe('formatConfigValue', () => {
  it('pretty prints valid JSON', () => {
    expect(formatConfigValue('{"enabled":true,"count":2}')).toBe(
      '{\n  "enabled": true,\n  "count": 2\n}',
    );
  });

  it('keeps non-JSON values unchanged', () => {
    expect(formatConfigValue('plain-text')).toBe('plain-text');
  });

  it('keeps an empty configuration value empty', () => {
    expect(formatConfigValue('')).toBe('');
  });
});
