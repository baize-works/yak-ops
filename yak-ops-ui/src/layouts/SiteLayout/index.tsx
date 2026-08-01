import {
  getActiveNavigationGroupId,
  getActiveNavigationId,
  getMainNavigationGroups,
  getQuickCreateRoutes,
  getRouteMetadata,
  getStandaloneNavigationRoutes,
  type NavigationIconKey,
  type NavigationRoute,
} from "@/config/navigation";
import { RouteAccessBoundary } from "@/components/security";
import SecurityProjectSwitcher from "@/components/security/SecurityProjectSwitcher";
import { SecurityProjectProvider, useSecurityProject } from "@/contexts/SecurityProjectContext";
import { logout } from "@/services/security/account";
import { history, Outlet, useLocation, useModel } from "@umijs/max";
import { Badge, Button, Drawer, Dropdown, type MenuProps } from "antd";
import {
  Activity,
  ArrowLeftRight,
  Bell,
  BookOpen,
  Braces,
  ChartLine,
  ChartPie,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  Database,
  FileText,
  Folder,
  History,
  House,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Server,
  Settings,
  SquarePlus,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import MessageList, { MESSAGE_COUNT_CHANGED_EVENT } from "@/pages/system/messages/MessageList";
import { getUnreadMessageCount } from "@/services/security/messages";

const HEADER_HEIGHT = 48;
const SIDEBAR_WIDTH = 200;
const COLLAPSED_SIDEBAR_WIDTH = 64;

const NAVIGATION_ICON_SIZE = 17;
const NAVIGATION_ICON_STROKE_WIDTH = 1.8;

const navigationIcons: Record<NavigationIconKey, ReactNode> = {
  home: (
    <House
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  database: (
    <Database
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  sync: (
    <ArrowLeftRight
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  realtime: (
    <Activity
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  client: (
    <Server
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  connector: (
    <Plug
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  workflow: (
    <Workflow
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  project: (
    <Folder
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  instance: (
    <History
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  quality: (
    <CircleCheck
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  report: (
    <FileText
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  monitor: (
    <ChartLine
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  alarm: (
    <Bell
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  knowledge: (
    <BookOpen
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  api: (
    <Braces
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  insight: (
    <ChartPie
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
  system: (
    <Settings
      size={NAVIGATION_ICON_SIZE}
      strokeWidth={NAVIGATION_ICON_STROKE_WIDTH}
    />
  ),
};

interface HeaderActionProps {
  icon: ReactNode;
  label: string;
  badge?: boolean;
  badgeCount?: number;
  onClick?: () => void;
}

function HeaderAction({
  icon,
  label,
  badge = false,
  badgeCount,
  onClick,
}: HeaderActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group relative flex h-12 min-w-11 flex-col
        items-center justify-center border-0 bg-transparent
        px-2 text-[12px] text-[rgba(35,35,35,0.6)]
        transition-colors duration-150
        hover:text-[rgba(35,35,35,0.9)]
      "
    >
      <span
        className="
          relative flex h-6 w-6 items-center
          justify-center text-[17px]
        "
      >
        <Badge count={badgeCount} size="small" overflowCount={99}>{icon}</Badge>

        {badge && !badgeCount && (
          <span
            className="
              absolute right-0 top-0 h-1.5 w-1.5
              rounded-full bg-[#fe2c55]
              ring-2 ring-white
            "
          />
        )}
      </span>

      <span
        className="
          mt-0.5 whitespace-nowrap text-[10px]
          leading-3
        "
      >
        {label}
      </span>
    </button>
  );
}

function BrandLogo({ compact }: { compact: boolean }) {
  return (
    <button
      type="button"
      aria-label="返回数据源管理"
      onClick={() => history.push("/data-source")}
      className={[
        "mt-3 mb-1.5 flex h-12 w-full items-center border-0 bg-transparent",
        "transition-all duration-200",
        compact ? "justify-center px-0" : "justify-start px-5",
      ].join(" ")}
    >
      {compact ? (
        <span className="relative block h-9 w-9 shrink-0 overflow-hidden">
          <img
            src="/logo.png"
            alt="Yak Ops"
            draggable={false}
            className="
              absolute left-[-3px] top-1/2
              h-9 max-w-none -translate-y-1/2
              select-none object-contain
            "
          />
        </span>
      ) : (
        <img
          src="/logo.png"
          alt="Yak Ops 一体化数字平台"
          draggable={false}
          className="
            block h-8 w-auto max-w-full
            select-none object-contain object-left
          "
        />
      )}
    </button>
  );
}

function SiteLayoutContent() {
  const location = useLocation();
  const { initialState, setInitialState } = useModel("@@initialState");
  const currentUser = initialState?.currentUser;
  const permissionCodes = currentUser?.permissionCodes;

  // Navigation metadata remains the single source of truth. Recalculate every
  // permission-derived collection together whenever the signed-in identity changes.
  const { standaloneRoutes, navigationGroups, quickCreateRoutes } = useMemo(
    () => ({
      standaloneRoutes: getStandaloneNavigationRoutes(permissionCodes),
      navigationGroups: getMainNavigationGroups(permissionCodes),
      quickCreateRoutes: getQuickCreateRoutes(permissionCodes),
    }),
    [permissionCodes],
  );
  const homeRoutes = standaloneRoutes.filter((route) => route.id === "home");
  const businessStandaloneRoutes = standaloneRoutes.filter(
    (route) => route.id !== "home"
  );

  const quickCreateRef = useRef<HTMLDivElement>(null);

  const [collapsed, setCollapsed] = useState(false);

  const [viewportCompact, setViewportCompact] = useState(false);

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  const { clearProject } = useSecurityProject();

  useEffect(() => {
    let active = true;
    const refresh = () => getUnreadMessageCount().then((count) => { if (active) setUnreadCount(count); }).catch(() => undefined);
    refresh();
    window.addEventListener(MESSAGE_COUNT_CHANGED_EVENT, refresh);
    return () => { active = false; window.removeEventListener(MESSAGE_COUNT_CHANGED_EVENT, refresh); };
  }, [currentUser?.userid]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      clearProject();
      await setInitialState((state) => ({
        ...state,
        currentUser: undefined,
        currentProject: undefined,
        securityProject: undefined,
      }));
      history.replace("/login");
    }
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "identity",
      disabled: true,
      label: (
        <div className="min-w-48 py-1">
          <div className="font-semibold text-[#161823]">
            {currentUser?.name ?? currentUser?.userName ?? "当前用户"}
          </div>
          <div className="mt-0.5 text-xs text-[rgba(22,24,35,0.5)]">
            {currentUser?.email ?? currentUser?.title ?? "Yak Security 用户"}
          </div>
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "logout",
      danger: true,
      icon: <LogOut className="h-4 w-4" />,
      label: loggingOut ? "正在退出…" : "退出登录",
      disabled: loggingOut,
      onClick: handleLogout,
    },
  ];

  const renderStandaloneItem = (route: NavigationRoute) => {
    const active = activeNavigationId === route.id;

    return (
      <button
        key={route.id}
        type="button"
        title={compact ? route.title : undefined}
        aria-label={compact ? route.title : undefined}
        aria-current={active ? "page" : undefined}
        onClick={() => navigate(route.path)}
        className={[
          "group relative flex h-10 w-full items-center border-0 bg-transparent",
          "text-left transition-colors duration-150",
          compact ? "justify-center px-0" : "gap-3 px-0",
          active
            ? "font-semibold text-[#161823]"
            : "font-medium text-[rgba(22,24,35,0.55)] hover:text-[#161823]",
        ].join(" ")}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[16px]">
          {route.iconKey && navigationIcons[route.iconKey]}
        </span>

        {!compact && (
          <span className="min-w-0 flex-1 truncate text-[14px]">
            {route.title}
          </span>
        )}

        {compact && active && (
          <span className="absolute right-0 h-4 w-[2px] rounded-full bg-[#161823]" />
        )}
      </button>
    );
  };

  /**
   * 抖音菜单允许多个分组同时展开，
   * 因此这里不再使用单个 openGroupId。
   */
  const [openGroupIds, setOpenGroupIds] = useState<Set<string>>(() => {
    const activeGroupId = getActiveNavigationGroupId(
      location.pathname,
      permissionCodes
    );

    return activeGroupId ? new Set([activeGroupId]) : new Set();
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1080px)");

    const syncViewport = () => {
      setViewportCompact(mediaQuery.matches);
    };

    syncViewport();

    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    const activeGroupId = getActiveNavigationGroupId(
      location.pathname,
      permissionCodes
    );

    if (!activeGroupId) {
      return;
    }

    setOpenGroupIds((current) => {
      if (current.has(activeGroupId)) {
        return current;
      }

      const next = new Set(current);
      next.add(activeGroupId);

      return next;
    });
  }, [location.pathname, permissionCodes]);

  useEffect(() => {
    setQuickCreateOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (quickCreateRef.current && !quickCreateRef.current.contains(target)) {
        setQuickCreateOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const compact = collapsed || viewportCompact;

  const sidebarWidth = compact ? COLLAPSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH;

  const activeNavigationId = getActiveNavigationId(
    location.pathname,
    permissionCodes
  );

  const routeMetadata = getRouteMetadata(location.pathname);

  const pageTitle = routeMetadata?.title ?? "Yak Ops";

  const userInitial = useMemo(() => {
    return currentUser?.name?.trim().slice(0, 1).toUpperCase() || "Y";
  }, [currentUser?.name]);

  const navigate = (path: string) => {
    setQuickCreateOpen(false);

    if (location.pathname !== path) {
      history.push(path);
    }
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroupIds((current) => {
      const next = new Set(current);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  };

  /**
   * 二级菜单参考抖音：
   *
   * 1. 不显示图标；
   * 2. 不使用大面积选中背景；
   * 3. 当前菜单使用深色和加粗表示；
   * 4. 菜单项保持较宽松的垂直间距。
   */
  const renderNavigationItem = (route: NavigationRoute) => {
    const active = activeNavigationId === route.id;

    return (
      <button
        key={route.id}
        type="button"
        title={compact ? route.title : undefined}
        aria-label={compact ? route.title : undefined}
        aria-current={active ? "page" : undefined}
        onClick={() => navigate(route.path)}
        className={[
          "group relative flex w-full items-center border-0",
          "bg-transparent text-left",
          "transition-colors duration-150",
          compact ? "h-10 justify-center px-0" : "h-9 justify-start pl-8 pr-1",
          active
            ? "font-semibold text-[#161823]"
            : [
                "font-normal",
                "text-[rgba(37,38,50,.6)]",
                "hover:text-[#161823]",
              ].join(" "),
        ].join(" ")}
      >
        {compact ? (
          <>
            <span
              className={[
                "flex h-8 w-8 items-center",
                "justify-center rounded-lg",
                "text-[15px]",
                active
                  ? [
                      "bg-white",
                      "text-[#161823]",
                      "shadow-[0_1px_4px_rgba(0,0,0,0.06)]",
                    ].join(" ")
                  : [
                      "text-[rgba(22,24,35,0.5)]",
                      "group-hover:bg-white/70",
                    ].join(" "),
              ].join(" ")}
            >
              {route.iconKey
                ? navigationIcons[route.iconKey]
                : route.title.slice(0, 1)}
            </span>

            {active && (
              <span
                className="
                  absolute right-0 top-1/2 h-4
                  w-[2px] -translate-y-1/2
                  rounded-full bg-[#161823]
                "
              />
            )}
          </>
        ) : (
          <span
            className="
              min-w-0 flex-1 truncate
              text-[14px] leading-5
            "
          >
            {route.title}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="
        h-screen overflow-hidden
        bg-[#f7f8f9] text-[#161823]
      "
    >
      <aside
        className="
          fixed inset-y-0 left-0 z-40
          flex flex-col overflow-hidden
          bg-[linear-gradient(180deg,#f2f2f7_0%,#f5f5f5_100%)]
          transition-[width] duration-200
          ease-[cubic-bezier(0.62,0.05,0.36,0.95)]
        "
        style={{
          width: sidebarWidth,
        }}
      >
        <BrandLogo compact={compact} />

        <div
          ref={quickCreateRef}
          className={[
            "relative z-50 shrink-0",
            quickCreateRoutes.length === 0 ? "hidden" : "",
            compact ? "mx-3 mb-4 mt-4" : "mx-6 mb-4 mt-4",
          ].join(" ")}
        >
          <button
            type="button"
            aria-label="快速创建"
            aria-expanded={quickCreateOpen}
            title={compact ? "快速创建" : undefined}
            onClick={() => setQuickCreateOpen((current) => !current)}
            className={[
              "flex h-10 items-center border-0 text-white",
              "bg-[linear-gradient(102deg,#fe516e_0%,#fe2c55_100%)]",
              "shadow-[0_6px_16px_rgba(254,44,85,0.22)]",
              "transition-all duration-200",
              "ease-[cubic-bezier(0.62,0.05,0.36,0.95)]",
              "hover:brightness-[0.97] active:brightness-95",
              compact
                ? "w-10 justify-center rounded-full px-0"
                : "w-full justify-start rounded-md px-3",
            ].join(" ")}
          >
            <SquarePlus className="h-4 w-4 shrink-0" strokeWidth={2} />

            {!compact && (
              <>
                <span
                  className="
                    ml-2 min-w-0 flex-1
                    truncate text-left text-[14px]
                    font-semibold
                  "
                >
                  快速创建
                </span>

                <ChevronDown
                  className={[
                    "h-3 w-3 shrink-0",
                    "transition-transform duration-200",
                    quickCreateOpen ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                />
              </>
            )}
          </button>

          {quickCreateOpen && (
            <div
              className={[
                "absolute z-[100]",
                "rounded-lg bg-white p-2",
                "shadow-[0_4px_24px_rgba(0,0,0,0.12)]",
                "ring-1 ring-black/[0.04]",
                compact
                  ? ["left-[48px] top-0", "w-44"].join(" ")
                  : ["left-0 right-0", "top-[48px]"].join(" "),
              ].join(" ")}
            >
              {quickCreateRoutes.length > 0 ? (
                quickCreateRoutes.map((route) => (
                  <button
                    type="button"
                    key={route.id}
                    onClick={() => navigate(route.path)}
                    className="
                        flex h-9 w-full items-center
                        rounded-md border-0 bg-transparent
                        px-2.5 text-left text-[14px]
                        text-[#1c1f23]
                        transition-colors duration-150
                        hover:bg-[#f5f5f6]
                      "
                  >
                    <span
                      className="
                          mr-2 flex h-5 w-5
                          shrink-0 items-center
                          justify-center
                          text-[14px]
                          text-[rgba(22,24,35,0.55)]
                        "
                    >
                      {route.iconKey ? (
                        navigationIcons[route.iconKey]
                      ) : (
                        <SquarePlus className="h-4 w-4" strokeWidth={1.8} />
                      )}
                    </span>

                    <span className="truncate">
                      {route.quickCreateLabel ?? route.title}
                    </span>
                  </button>
                ))
              ) : (
                <div
                  className="
                    px-2 py-2 text-[12px]
                    text-[rgba(22,24,35,0.4)]
                  "
                >
                  暂无可创建内容
                </div>
              )}
            </div>
          )}
        </div>

        <nav
          className={[
            "min-h-0 flex-1 overflow-y-auto",
            "pb-5",
            compact ? "px-3" : "px-6",
          ].join(" ")}
          style={{
            scrollbarWidth: "none",
          }}
        >
          <div>
            {homeRoutes.length > 0 && (
              <div
                className={[
                  "mb-3 border-b pb-3",
                  "border-[rgba(37,38,50,0.10)]",
                ].join(" ")}
              >
                {homeRoutes.map(renderStandaloneItem)}
              </div>
            )}

            {businessStandaloneRoutes.length > 0 && (
              <div className="mb-1">
                {businessStandaloneRoutes.map(renderStandaloneItem)}
              </div>
            )}

            {navigationGroups.map((group, groupIndex) => {
              const open = openGroupIds.has(group.id);

              const active = group.routes.some(
                (route) => route.id === activeNavigationId
              );

              const previousGroup = navigationGroups[groupIndex - 1];

              const showSectionDivider =
                previousGroup && previousGroup.section !== group.section;

              return (
                <section
                  key={group.id}
                  className={[
                    "mb-3",
                    showSectionDivider
                      ? [
                          "mt-3 border-t pt-3",
                          "border-[rgba(37,38,50,0.10)]",
                        ].join(" ")
                      : "",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    title={compact ? group.title : undefined}
                    aria-label={compact ? group.title : undefined}
                    aria-expanded={open}
                    onClick={() => toggleGroup(group.id)}
                    className={[
                      "group relative flex w-full",
                      "items-center border-0",
                      "bg-transparent text-left",
                      "transition-colors duration-150",
                      compact
                        ? ["h-10", "justify-center", "px-0"].join(" ")
                        : ["h-10", "justify-start", "px-0"].join(" "),
                      active || open
                        ? ["font-semibold", "text-[#161823]"].join(" ")
                        : [
                            "font-medium",
                            "text-[rgba(22,24,35,0.55)]",
                            "hover:text-[#161823]",
                          ].join(" "),
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-5 w-5 shrink-0",
                        "items-center justify-center",
                        "text-[16px]",
                        active
                          ? "text-[#161823]"
                          : [
                              "text-[rgba(22,24,35,0.5)]",
                              "group-hover:text-[#161823]",
                            ].join(" "),
                      ].join(" ")}
                    >
                      {navigationIcons[group.iconKey]}
                    </span>

                    {!compact && (
                      <>
                        <span
                          className="
                              ml-3 min-w-0 flex-1
                              truncate text-[14px]
                            "
                        >
                          {group.title}
                        </span>

                        <ChevronDown
                          className={[
                            "h-3 w-3 shrink-0",
                            "text-[rgba(22,24,35,0.35)]",
                            "transition-transform",
                            "duration-200",
                            open ? "rotate-180" : "rotate-0",
                          ].join(" ")}
                        />
                      </>
                    )}

                    {compact && active && (
                      <span
                        className="
                              absolute right-0 top-1/2
                              h-4 w-[2px]
                              -translate-y-1/2
                              rounded-full bg-[#161823]
                            "
                      />
                    )}
                  </button>

                  <div
                    className={[
                      "grid overflow-hidden",
                      "transition-[grid-template-rows,opacity]",
                      "duration-200",
                      "ease-[cubic-bezier(0.62,0.05,0.36,0.95)]",
                      open
                        ? ["grid-rows-[1fr]", "opacity-100"].join(" ")
                        : ["grid-rows-[0fr]", "opacity-0"].join(" "),
                    ].join(" ")}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className={[
                          "space-y-0.5",
                          compact ? "pt-1" : "pt-1.5",
                        ].join(" ")}
                      >
                        {group.routes.map(renderNavigationItem)}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </nav>

        <div
          className={["shrink-0 pb-4 pt-2", compact ? "px-3" : "px-6"].join(
            " "
          )}
        >
          <button
            type="button"
            title={compact ? "帮助中心" : undefined}
            className={[
              "flex h-10 w-full items-center",
              "border-0 bg-transparent",
              "text-[rgba(22,24,35,0.5)]",
              "transition-colors duration-150",
              "hover:text-[#161823]",
              compact ? "justify-center px-0" : "justify-start px-0",
            ].join(" ")}
          >
            <CircleHelp className="h-4 w-4" strokeWidth={1.8} />

            {!compact && (
              <span
                className="
                  ml-3 text-[14px]
                  font-medium
                "
              >
                帮助中心
              </span>
            )}
          </button>
        </div>
      </aside>

      <header
        className="
          fixed right-0 top-0 z-30
          flex items-center 
          transition-[left] duration-200
          ease-[cubic-bezier(0.62,0.05,0.36,0.95)]
        "
        style={{
          left: sidebarWidth,
          height: HEADER_HEIGHT,
        }}
      >
        <div
          className="
            flex h-full min-w-0 flex-1
            items-center px-4
          "
        >
          <button
            type="button"
            aria-label={compact ? "展开菜单" : "收起菜单"}
            onClick={() => setCollapsed((current) => !current)}
            className="
              hidden h-8 w-8 items-center
              justify-center rounded-md
              border-0 bg-transparent
              text-[16px]
              text-[rgba(22,24,35,0.5)]
              transition-colors duration-150
              hover:bg-[#f5f5f6]
              hover:text-[#161823]
              md:flex
            "
          >
            {compact ? (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={1.8} />
            ) : (
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.8} />
            )}
          </button>

          <div
            className="
              ml-2 min-w-0
              border-l border-[rgba(28,31,35,0.08)]
              pl-4
            "
          >
            <div
              className="
                truncate text-[14px]
                font-semibold leading-5
                text-[#1c1f23]
              "
            >
              {pageTitle}
            </div>
          </div>
        </div>

        <div
          className="
            flex h-full shrink-0
            items-center pr-5
          "
        >
          <HeaderAction
            icon={<Bell className="h-[17px] w-[17px]" strokeWidth={1.8} />}
            label="通知"
            badge={unreadCount > 0}
            badgeCount={unreadCount}
            onClick={() => setNotificationOpen(true)}
          />

          <SecurityProjectSwitcher />

          <div
            className="
              ml-4 flex items-center
              border-l border-[rgba(28,31,35,0.08)]
              pl-4
            "
          >
            <Dropdown menu={{ items: userMenuItems }} trigger={["click"]}>
              <button
                type="button"
                aria-label="打开用户菜单"
                className="flex items-center gap-2 border-0 bg-transparent p-0"
              >
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name ?? "当前用户"}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5e7eb] text-[12px] font-semibold text-[#475569]">
                    {userInitial}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 text-[rgba(22,24,35,0.4)]" />
              </button>
            </Dropdown>
          </div>
        </div>
      </header>

      <Drawer
        title="消息中心"
        placement="right"
        width={720}
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      >
        <MessageList compact />
        <Button block onClick={() => { setNotificationOpen(false); history.push('/system/messages'); }}>查看全部消息</Button>
      </Drawer>

      <main
        className="
          h-screen overflow-hidden
          bg-[#f7f8f9]
          transition-[padding] duration-200
          ease-[cubic-bezier(0.62,0.05,0.36,0.95)]
        "
        style={{
          paddingLeft: sidebarWidth,
          paddingTop: HEADER_HEIGHT,
        }}
      >
        <div
          className="
            h-full w-full overflow-auto
            px-4  pt-4
          "
        >
          <div
            className="
              min-h-full min-w-[912px]
              overflow-hidden rounded-md
              bg-white
            "
          >
            <RouteAccessBoundary permissionCodes={permissionCodes}>
              <Outlet />
            </RouteAccessBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SiteLayout() {
  return <SecurityProjectProvider><SiteLayoutContent /></SecurityProjectProvider>;
}
