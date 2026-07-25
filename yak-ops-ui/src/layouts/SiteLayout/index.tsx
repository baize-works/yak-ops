import {
  ApiOutlined,
  ApartmentOutlined,
  BellOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  DownOutlined,
  LineChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PieChartOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { history, Outlet, useLocation, useModel } from '@umijs/max';
import {
  getActiveNavigationGroupId,
  getActiveNavigationId,
  getMainNavigationGroups,
  getQuickCreateRoutes,
  getRouteMetadata,
  type NavigationIconKey,
  type NavigationRoute,
} from '@/config/navigation';

const navigationIcons: Record<NavigationIconKey, ReactNode> = {
  database: <DatabaseOutlined />,
  sync: <ApartmentOutlined />,
  client: <CloudServerOutlined />,
  monitor: <LineChartOutlined />,
  alarm: <BellOutlined />,
  knowledge: <ReadOutlined />,
  api: <ApiOutlined />,
  insight: <PieChartOutlined />,
};

const navigationGroups = getMainNavigationGroups();
const quickCreateRoute = getQuickCreateRoutes()[0];

const SidebarLogo = ({ compact }: { compact: boolean }) => {
  return (
    <button
      type="button"
      onClick={() => history.push('/data-source')}
      className={[
        'flex h-16 w-full items-center overflow-hidden border-0 bg-transparent',
        compact ? 'justify-center px-3' : 'justify-start px-5',
      ].join(' ')}
      aria-label="返回数据源管理"
    >
      <span
        className={[
          'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white',
          compact ? 'h-10 w-10 shadow-sm' : 'h-11 w-full',
        ].join(' ')}
      >
        <img
          src="/logo.png"
          alt="Yak Ops"
          className={[
            'max-w-none object-contain',
            compact ? 'h-9 w-9' : 'h-10 max-w-[184px]',
          ].join(' ')}
        />
      </span>
    </button>
  );
};

export default function SiteLayout() {
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const [collapsed, setCollapsed] = useState(false);
  const [viewportCompact, setViewportCompact] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | null>(() => {
    return getActiveNavigationGroupId(location.pathname) ?? null;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1080px)');
    const syncViewport = () => setViewportCompact(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);

    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    const activeGroupId = getActiveNavigationGroupId(location.pathname);
    if (activeGroupId) {
      setOpenGroupId(activeGroupId);
    }
  }, [location.pathname]);

  const compact = collapsed || viewportCompact;
  const sidebarWidth = compact ? 72 : 224;
  const activeNavigationId = getActiveNavigationId(location.pathname);
  const routeMetadata = getRouteMetadata(location.pathname);
  const pageTitle = routeMetadata?.title ?? 'Yak Ops';
  const currentUser = initialState?.currentUser;

  const userInitial = useMemo(() => {
    return currentUser?.name?.trim().slice(0, 1).toUpperCase() || 'Y';
  }, [currentUser?.name]);

  const navigate = (path: string) => {
    if (location.pathname !== path) {
      history.push(path);
    }
  };

  const renderNavigationItem = (route: NavigationRoute) => {
    const active = activeNavigationId === route.id;

    return (
      <button
        key={route.id}
        type="button"
        title={compact ? route.title : undefined}
        aria-label={compact ? route.title : undefined}
        aria-current={active ? 'page' : undefined}
        onClick={() => navigate(route.path)}
        className={[
          'relative flex h-10 w-full items-center rounded-lg border-0 text-left',
          'transition-colors duration-150',
          compact ? 'justify-center px-0' : 'gap-3 px-3 pl-9',
          active
            ? 'bg-white font-semibold text-slate-950 shadow-sm'
            : 'bg-transparent font-medium text-slate-500 hover:bg-white/70 hover:text-slate-900',
        ].join(' ')}
      >
        {active && !compact && (
          <span className="absolute left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#4f46e5]" />
        )}

        <span
          className={[
            'flex h-5 w-5 shrink-0 items-center justify-center text-[16px]',
            active ? 'text-[#4f46e5]' : 'text-slate-400',
          ].join(' ')}
        >
          {route.iconKey ? navigationIcons[route.iconKey] : <SafetyCertificateOutlined />}
        </span>

        {!compact && <span className="min-w-0 flex-1 truncate text-[13px]">{route.title}</span>}

        {active && compact && (
          <span className="absolute right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#4f46e5]" />
        )}
      </button>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f5f6f8] text-slate-950">
      <aside
        className="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-black/[0.04] bg-[#f1f2f5] transition-[width] duration-200"
        style={{ width: sidebarWidth }}
      >
        <SidebarLogo compact={compact} />

        {quickCreateRoute && (
          <div className={compact ? 'px-2 pb-3 pt-2' : 'px-4 pb-3 pt-2'}>
            <button
              type="button"
              title={compact ? quickCreateRoute.quickCreateLabel : undefined}
              aria-label={quickCreateRoute.quickCreateLabel}
              onClick={() => navigate(quickCreateRoute.path)}
              className={[
                'flex h-11 w-full items-center rounded-lg border-0 bg-[#4f46e5] text-white',
                'shadow-[0_6px_16px_rgba(79,70,229,0.2)] transition-colors duration-150 hover:bg-[#4338ca]',
                compact ? 'justify-center px-0' : 'gap-2.5 px-3.5',
              ].join(' ')}
            >
              <PlusOutlined className="shrink-0 text-[14px]" />
              {!compact && (
                <span className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold">
                  {quickCreateRoute.quickCreateLabel}
                </span>
              )}
            </button>
          </div>
        )}

        <nav className={['min-h-0 flex-1 overflow-y-auto pb-4', compact ? 'px-2' : 'px-3'].join(' ')}>
          <div className="space-y-1.5">
            {navigationGroups.map((group) => {
              const open = openGroupId === group.id;
              const active = group.routes.some((route) => route.id === activeNavigationId);

              return (
                <section key={group.id} className="rounded-xl">
                  <button
                    type="button"
                    title={compact ? group.title : undefined}
                    aria-label={compact ? group.title : undefined}
                    aria-expanded={open}
                    onClick={() => setOpenGroupId((current) => (current === group.id ? null : group.id))}
                    className={[
                      'flex h-11 w-full items-center rounded-xl border-0 text-left transition-colors duration-150',
                      compact ? 'justify-center px-0' : 'gap-3 px-3',
                      active || open
                        ? 'bg-white/80 font-semibold text-slate-950'
                        : 'bg-transparent font-semibold text-slate-600 hover:bg-white/60 hover:text-slate-950',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-5 w-5 shrink-0 items-center justify-center text-[17px]',
                        active ? 'text-[#4f46e5]' : 'text-slate-500',
                      ].join(' ')}
                    >
                      {navigationIcons[group.iconKey]}
                    </span>

                    {!compact && (
                      <>
                        <span className="min-w-0 flex-1 truncate text-[13px]">{group.title}</span>
                        <DownOutlined
                          className={[
                            'text-[9px] text-slate-400 transition-transform duration-150',
                            open ? 'rotate-180' : 'rotate-0',
                          ].join(' ')}
                        />
                      </>
                    )}

                    {compact && open && (
                      <span className="absolute right-1.5 h-1.5 w-1.5 rounded-full bg-[#4f46e5]" />
                    )}
                  </button>

                  {open && (
                    <div className={['space-y-1 pb-1 pt-1', compact ? '' : 'pl-0'].join(' ')}>
                      {group.routes.map(renderNavigationItem)}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </nav>

        <div className={['shrink-0 pb-4 pt-2', compact ? 'px-2' : 'px-3'].join(' ')}>
          <button
            type="button"
            title={compact ? '帮助中心' : undefined}
            className={[
              'flex h-10 w-full items-center rounded-lg border-0 bg-transparent text-slate-500 transition-colors duration-150 hover:bg-white/70 hover:text-slate-900',
              compact ? 'justify-center' : 'gap-3 px-3',
            ].join(' ')}
          >
            <QuestionCircleOutlined className="text-[16px]" />
            {!compact && <span className="text-[13px] font-medium">帮助中心</span>}
          </button>
        </div>
      </aside>

      <header
        className="fixed right-0 top-0 z-30 flex h-16 items-center border-b border-black/[0.04] bg-white/95 px-4 backdrop-blur transition-[left] duration-200 sm:px-6"
        style={{ left: sidebarWidth }}
      >
        <button
          type="button"
          aria-label={compact ? '展开菜单' : '收起菜单'}
          onClick={() => setCollapsed((value) => !value)}
          className="hidden h-9 w-9 items-center justify-center rounded-lg border-0 bg-transparent text-[17px] text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 md:flex"
        >
          {compact ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>

        <div className="ml-2 min-w-0 sm:ml-3">
          <div className="truncate text-[15px] font-semibold text-slate-950">{pageTitle}</div>
          <div className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 sm:block">
            Yak Ops Control Plane
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label="消息通知"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border-0 bg-transparent text-[16px] text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
          >
            <BellOutlined />
          </button>

          <div className="ml-1 flex min-w-0 items-center gap-2 rounded-xl px-1.5 py-1">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name || '当前用户'}
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 ring-1 ring-slate-300">
                {userInitial}
              </span>
            )}

            <span className="hidden min-w-0 lg:block">
              <span className="block max-w-[120px] truncate text-[12px] font-semibold text-slate-800">
                {currentUser?.name || 'Yak Ops'}
              </span>
              <span className="mt-0.5 block text-[9px] text-slate-400">Administrator</span>
            </span>
          </div>
        </div>
      </header>

      <main
        className="h-screen overflow-hidden pt-16 transition-[padding] duration-200"
        style={{ paddingLeft: sidebarWidth }}
      >
        <div className="h-[calc(100vh-64px)] w-full overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
