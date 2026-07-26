import { history, useModel } from '@umijs/max';
import { createStyles } from 'antd-style';
import { logout } from '@/services/security/account';

import React, { useEffect, useRef, useState } from 'react';
import './index.less';

export type GlobalHeaderRightProps = {
  menu?: boolean;
  children?: React.ReactNode;
};

export const AvatarName = () => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  return <span className="anticon">{currentUser?.name}</span>;
};

const useStyles = createStyles(({ token }) => {
  return {
    action: {
      display: 'flex',
      height: '48px',
      marginLeft: 'auto',
      overflow: 'hidden',
      alignItems: 'center',
      padding: '0 8px',
      cursor: 'pointer',
      borderRadius: token.borderRadius,
      '&:hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
  };
});

const PixelCheekyFace: React.FC = () => {
  return (
    <svg
      viewBox="0 0 16 16"
      width="20"
      height="20"
      aria-hidden="true"
      shapeRendering="crispEdges"
      className="ml-1 shrink-0 overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        {/* 轻微上下晃动 */}
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 0; 0 -0.4; 0 0.3; 0 0"
          keyTimes="0; 0.45; 0.62; 0.78; 1"
          dur="1.8s"
          repeatCount="indefinite"
        />

        {/* 外框 */}
        <rect x="3" y="1" width="10" height="1" fill="#111827" />
        <rect x="2" y="2" width="1" height="10" fill="#111827" />
        <rect x="13" y="2" width="1" height="10" fill="#111827" />
        <rect x="3" y="12" width="10" height="1" fill="#111827" />

        {/* 脸 */}
        <rect x="3" y="2" width="10" height="10" fill="#fde68a" />

        {/* 左挑眉 */}
        <rect x="4" y="4" width="1" height="1" fill="#111827" />
        <rect x="5" y="3" width="2" height="1" fill="#111827" />

        {/* 右眉 */}
        <rect x="9" y="3" width="2" height="1" fill="#111827" />
        <rect x="11" y="4" width="1" height="1" fill="#111827" />

        {/* 左眼：坏笑眯眼 */}
        <rect x="5" y="6" width="2" height="1" fill="#111827" />

        {/* 右眼：眨眼 */}
        <g>
          <rect x="9" y="6" width="2" height="1" fill="#111827" />
          <animate
            attributeName="opacity"
            values="1;1;0.2;1;1"
            keyTimes="0;0.68;0.74;0.8;1"
            dur="2.1s"
            repeatCount="indefinite"
          />
        </g>

        {/* 腮红 */}
        <rect x="4" y="8" width="1" height="1" fill="#f9a8d4" />
        <rect x="11" y="8" width="1" height="1" fill="#f9a8d4" />

        {/* 坏笑嘴 */}
        <rect x="6" y="9" width="3" height="1" fill="#111827" />
        <rect x="9" y="10" width="2" height="1" fill="#111827" />

        {/* 吐舌头 */}
        <g>
          <rect x="8" y="11" width="1" height="1" fill="#ef4b87" />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; 0 0; 0 0.4; 0 0"
            keyTimes="0;0.55;0.72;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </g>
      </g>
    </svg>
  );
};

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({
  menu,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setInitialState } = useModel('@@initialState');

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      // Identity, grants and the selected Security project only live in memory.
      // Clear them even if the server has already invalidated the Session.
      await setInitialState((state) => ({
        ...state,
        currentUser: undefined,
        currentProject: undefined,
        securityProject: undefined,
      }));
      history.replace('/login');
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* 点击区域 */}
      <button
        type="button"
        aria-label="打开用户菜单"
        aria-expanded={open}
        className="cursor-pointer border-0 bg-transparent p-0 outline-none"
        onClick={() => setOpen((previous) => !previous)}
      >
        {/* 原来的头像样式，完全不变 */}
        <div className="status-pill">
          <span className="status-dot">S</span>
        </div>
      </button>

      {/* 自定义下拉框 */}
      <div
        className={`
    absolute right-0 top-[calc(100%+14px)]
    z-[1000]
    flex min-h-[64px] w-[220px]
    items-center justify-center
    rounded-[14px]
    border border-[#d1d5db]
    bg-white px-5
    shadow-[0_6px_18px_rgba(15,23,42,0.06)]
    transition-all duration-200 ease-out
    ${
      open
        ? 'visible translate-y-0 scale-100 opacity-100'
        : 'invisible -translate-y-1 scale-[0.98] opacity-0'
    }
  `}
      >
        {/* 小箭头 */}
        <span
          className="
            absolute right-5 top-[-7px]
            h-[14px] w-[14px]
            rotate-45
            border-l border-t border-[#d1d5db]
            bg-white
          "
        />

        <button
          type="button"
          className="relative z-10 inline-flex cursor-pointer flex-row items-center justify-center gap-2 whitespace-nowrap border-0 bg-transparent text-[15px] font-semibold text-[#475569]"
          disabled={loggingOut}
          onClick={handleLogout}
        >
          <span>{loggingOut ? '正在退出…' : '退出登录'}</span>
          <PixelCheekyFace />
        </button>
      </div>
    </div>
  );
};
