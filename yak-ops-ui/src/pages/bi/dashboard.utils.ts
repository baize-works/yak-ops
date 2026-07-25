import type {Layout} from "react-grid-layout";

import {DEFAULT_LAYOUT, MARGIN, MIN_ROW_COUNT, ROW_HEIGHT, STORAGE_KEY,} from "./dashboard.data";

export const getInitialLayout = (): Layout[] => {
  try {
    const storedLayout = localStorage.getItem(STORAGE_KEY);

    if (!storedLayout) {
      return DEFAULT_LAYOUT;
    }

    const parsedLayout = JSON.parse(storedLayout);

    if (Array.isArray(parsedLayout) && parsedLayout.length > 0) {
      return parsedLayout;
    }

    return DEFAULT_LAYOUT;
  } catch (error) {
    console.warn("Failed to parse dashboard layout:", error);
    return DEFAULT_LAYOUT;
  }
};

export const getLayoutBottomRow = (layout: Layout[]) => {
  if (!layout.length) {
    return MIN_ROW_COUNT;
  }

  return Math.max(...layout.map((item) => item.y + item.h), MIN_ROW_COUNT);
};

export const getCanvasHeight = (rowCount: number) => {
  const [, marginY] = MARGIN;

  return rowCount * ROW_HEIGHT + Math.max(rowCount - 1, 0) * marginY;
};

export const persistDashboardLayout = (layout: Layout[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
};
