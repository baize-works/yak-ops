import {
  API_SUCCESS_CODE,
  extractErrorMessage,
  isApiResponse,
  isSuccessfulResponse,
  isUnauthenticatedResponse,
  protocolForUrl,
} from './response';

describe('API response protocols', () => {
  it('uses the framework success code for every API namespace', () => {
    expect(API_SUCCESS_CODE).toBe(200);
    expect(isSuccessfulResponse({ code: 200 }, 'yak-ops')).toBe(true);
    expect(isSuccessfulResponse({ code: 200 }, 'security')).toBe(true);
    expect(isSuccessfulResponse({ code: 0 }, 'yak-ops')).toBe(false);
    expect(isSuccessfulResponse({ code: 0 }, 'security')).toBe(false);
  });

  it('extracts errors from both envelope variants', () => {
    expect(extractErrorMessage({ code: 999, msg: 'ops failed' })).toBe(
      'ops failed',
    );
    expect(extractErrorMessage({ code: 500, message: 'security failed' })).toBe(
      'security failed',
    );
  });

  it('recognizes business session expiry without treating forbidden as anonymous', () => {
    expect(isUnauthenticatedResponse({ code: 401 }, 'yak-ops')).toBe(true);
    expect(isUnauthenticatedResponse({ code: 401 }, 'security')).toBe(true);
    expect(isUnauthenticatedResponse({ code: 403 }, 'security')).toBe(false);
    expect(
      isUnauthenticatedResponse(
        { code: 999, message: 'session_expired' },
        'security',
      ),
    ).toBe(true);
  });

  it('routes only security endpoints to the security protocol', () => {
    expect(isApiResponse({ data: { code: 200 } })).toBe(false);
    expect(protocolForUrl('/yak-security/api/v1/account/current')).toBe(
      'security',
    );
    expect(protocolForUrl('/api/v1/workflows')).toBe('yak-ops');
    expect(protocolForUrl('/api/v1/data-sources')).toBe('yak-ops');
    expect(protocolForUrl('/api/v1/jobs')).toBe('yak-ops');
  });
});
