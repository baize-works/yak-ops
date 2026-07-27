/**
 * @name 代理的配置
 * @see 在生产环境 代理是无法生效的，所以这里没有生产环境的配置
 * -------------------------------
 * The agent cannot take effect in the production environment
 * so there is no configuration of the production environment
 * For details, please see
 * https://pro.ant.design/docs/deploy
 *
 * @doc https://umijs.org/docs/guides/proxy
 */

export default {
  dev: {
    '/api/': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      pathRewrite: { '^/api': '/api' },
    },
    // Keep security calls same-origin in development. The prefix is an ingress
    // concern, so the local backend receives (for example) /api/v1/account.
    '/yak-security/': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      pathRewrite: { '^/yak-security': '' },
      // Do not leak an upstream Domain, and scope its session to this ingress.
      // The backend remains responsible for HttpOnly/Secure and SameSite=Lax.
      cookieDomainRewrite: '',
      cookiePathRewrite: { '*': '/yak-security/' },
    },
    '/profile/avatar/': {
      changeOrigin: true,
      target: 'http://localhost:80',
    },
  },
  '/api/': {
    test: {
      target: 'http://localhost:80',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
  pre: {
    '/api/': {
      target: 'your pre url',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
};
