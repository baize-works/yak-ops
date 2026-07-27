import { AvatarDropdown, AvatarName, Footer } from '@/components';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import '@ant-design/v5-patch-for-react-19';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import 'd3-transition';
import defaultSettings from '../config/defaultSettings';
import { GlobalSearch, Knowledge } from './components/RightContent';
import { getCurrentUser } from './services/security/account';
import { toCurrentUser } from './services/security/currentIdentity';
import { BizError } from './utils/request';
import { getCurrentReturnTo, getSafeReturnTo, isLoginPath } from './utils/security/redirect';

export { toCurrentUser } from './services/security/currentIdentity';

const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/login';

const redirectAnonymousUser = () => {
  if (isLoginPath(window.location.pathname)) return;

  const returnTo = getCurrentReturnTo();
  history.replace(`${loginPath}?returnTo=${encodeURIComponent(returnTo)}`);
};

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  currentProject?: unknown;
  securityProject?: unknown;
  currentUserLoadError?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  const fetchUserInfo = async () => toCurrentUser(await getCurrentUser());
  // Always probe the cookie-backed Session, including after a reload on login.
  let currentUser: API.CurrentUser | undefined;
  let currentUserLoadError = false;
  try {
  currentUser = await fetchUserInfo();
} catch (error) {
  currentUserLoadError = true;

  // 当前用户获取失败时，至少先让登录页面正常展示，
  // 避免一直停留在初始化动画。
  redirectAnonymousUser();
}
  if (currentUser && isLoginPath(window.location.pathname)) {
    const requested = new URLSearchParams(window.location.search).get('returnTo');
    history.replace(getSafeReturnTo(requested));
  }
  return {
    fetchUserInfo,
    currentUser,
    currentUserLoadError,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    menuProps: {
      defaultOpenKeys: ['/sync'],
    },
    actionsRender: () => [
      <GlobalSearch key="globalsearch" />,
      // <OpenAPI key="open-api" />,
      <Knowledge key="knowledge" />,
      // <BI key="bi" />,
      // <ThemeSwitch key="theme-switch" />,
      // <SelectLang key="SelectLang" />,
    ],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown>{avatarChildren}</AvatarDropdown>;
      },
    },
    waterMarkProps: {
      content: initialState?.currentUser?.name,
    },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (
        !initialState?.currentUser &&
        !initialState?.currentUserLoadError &&
        location.pathname !== loginPath
      ) {
        redirectAnonymousUser();
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
          {children}
          {isDev && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </>
      );
    },
    ...initialState?.settings,
  };
};
