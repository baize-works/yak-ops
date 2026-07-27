import { formatJsonText } from './operationLogs';

describe('formatJsonText', () => {
  it('pretty prints valid JSON without producing HTML', () => {
    expect(formatJsonText('{"value":"<script>alert(1)</script>"}')).toBe('{\n  "value": "<script>alert(1)</script>"\n}');
  });
  it('returns invalid JSON as raw text', () => {
    expect(formatJsonText('not-json')).toBe('not-json');
  });
});
