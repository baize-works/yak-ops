import {
  extractErrorMessage,
  isApiResponse,
  isSuccessfulResponse,
  isUnauthenticatedResponse,
  protocolForUrl,
} from './response';

describe('API response protocols', () => {
  it('keeps success codes isolated by namespace', () => {
    expect(isSuccessfulResponse({ code: 0 }, 'yak-ops')).toBe(true);
    expect(isSuccessfulResponse({ code: 200 }, 'security')).toBe(true);
    expect(isSuccessfulResponse({ code: 200 }, 'yak-ops')).toBe(false);
    expect(isSuccessfulResponse({ code: 0 }, 'security')).toBe(false);
  });

  it('extracts errors from both envelope variants', () => {
    expect(extractErrorMessage({ code: 2, msg: 'ops failed' })).toBe('ops failed');
    expect(extractErrorMessage({ code: 500, message: 'security failed' })).toBe('security failed');
  });

  it('recognizes business session expiry without treating forbidden as anonymous', () => {
    expect(isUnauthenticatedResponse({ code: 401 }, 'security')).toBe(true);
    expect(isUnauthenticatedResponse({ code: 403 }, 'security')).toBe(false);
    expect(isUnauthenticatedResponse({ code: 9, message: 'session_expired' }, 'security')).toBe(true);
  });

  it('does not parse arbitrary JSON as an envelope', () => {
    expect(isApiResponse({ data: { code: 200 } })).toBe(false);
    expect(protocolForUrl('/yak-security/api/v1/account/current')).toBe('security');
    expect(protocolForUrl('/api/v1/jobs')).toBe('yak-ops');
  });
});

