import type { ThemeConfig } from 'antd';

/** Yak Ops 全局品牌主色。 */
export const BRAND_COLOR = 'rgba(254,44,85,1)';

/** 品牌色交互及弱化状态。 */
export const BRAND_COLOR_HOVER = 'rgba(254,44,85,0.88)';
export const BRAND_COLOR_ACTIVE = BRAND_COLOR;
export const BRAND_COLOR_SOFT = 'rgba(254,44,85,0.06)';
export const BRAND_COLOR_SOFT_HOVER = 'rgba(254,44,85,0.1)';
export const BRAND_COLOR_BORDER = 'rgba(254,44,85,0.35)';
export const BRAND_COLOR_OUTLINE = 'rgba(254,44,85,0.16)';

/**
 * Ant Design 品牌主题。
 *
 * 页面或组件需要品牌交互色时，可通过 ConfigProvider 局部引入；
 * 后续若升级为应用级主题，也可以直接复用该配置。
 */
export const BRAND_THEME: ThemeConfig = {
  token: {
    colorPrimary: BRAND_COLOR,
    colorPrimaryHover: BRAND_COLOR_HOVER,
    colorPrimaryActive: BRAND_COLOR_ACTIVE,
    colorPrimaryBg: BRAND_COLOR_SOFT,
    colorPrimaryBgHover: BRAND_COLOR_SOFT_HOVER,
    colorPrimaryBorder: BRAND_COLOR_BORDER,
    controlOutline: BRAND_COLOR_OUTLINE,
  },
};
