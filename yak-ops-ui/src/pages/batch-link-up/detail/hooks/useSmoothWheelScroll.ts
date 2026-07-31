import { useEffect, type RefObject } from "react";

export type ScrollContainer = HTMLElement | Window;

const LINE_SCROLL_PIXELS = 40;
const SMOOTH_SCROLL_DURATION = 180;
const SCROLL_EPSILON = 0.5;

const SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  " ",
]);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const easeInOutSine = (progress: number) =>
  (1 - Math.cos(Math.PI * progress)) / 2;

const isWindowContainer = (
  scrollContainer: ScrollContainer,
): scrollContainer is Window => scrollContainer === window;

const getDocumentScrollHeight = () =>
  Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
  );

const getScrollTop = (scrollContainer: ScrollContainer) =>
  isWindowContainer(scrollContainer)
    ? window.scrollY || document.documentElement.scrollTop
    : scrollContainer.scrollTop;

const setScrollTop = (
  scrollContainer: ScrollContainer,
  scrollTop: number,
) => {
  if (isWindowContainer(scrollContainer)) {
    window.scrollTo(window.scrollX, scrollTop);
    return;
  }

  scrollContainer.scrollTop = scrollTop;
};

const getScrollViewportHeight = (
  scrollContainer: ScrollContainer,
) =>
  isWindowContainer(scrollContainer)
    ? window.innerHeight
    : scrollContainer.clientHeight;

const getMaxScrollTop = (
  scrollContainer: ScrollContainer,
) =>
  Math.max(
    0,
    isWindowContainer(scrollContainer)
      ? getDocumentScrollHeight() - window.innerHeight
      : scrollContainer.scrollHeight - scrollContainer.clientHeight,
  );

const normalizeWheelDelta = (
  event: WheelEvent,
  viewportHeight: number,
) => {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * LINE_SCROLL_PIXELS;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * viewportHeight;
  }

  return event.deltaY;
};

const canScrollInDirection = (
  element: HTMLElement,
  deltaY: number,
) => {
  const style = window.getComputedStyle(element);

  if (!/(auto|scroll|overlay)/.test(style.overflowY)) {
    return false;
  }

  if (element.scrollHeight <= element.clientHeight + 1) {
    return false;
  }

  if (deltaY > 0) {
    return (
      element.scrollTop + element.clientHeight <
      element.scrollHeight - 1
    );
  }

  return element.scrollTop > 1;
};

const shouldUseNestedScroll = (
  target: EventTarget | null,
  boundary: HTMLElement,
  deltaY: number,
) => {
  let element =
    target instanceof HTMLElement ? target : null;

  while (element && element !== boundary) {
    if (canScrollInDirection(element, deltaY)) {
      return true;
    }

    element = element.parentElement;
  }

  return false;
};

/**
 * 查找元素真正所在的纵向滚动容器。
 *
 * Umi / ProLayout 页面通常由中间内容区域负责滚动，
 * 因此不能只处理 window。
 */
export const findScrollContainer = (
  element: HTMLElement,
): ScrollContainer => {
  let parent = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);

    if (/(auto|scroll|overlay)/.test(style.overflowY)) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
};

/** 获取滚动容器可视区域的底部位置。 */
export const getScrollViewportBottom = (
  scrollContainer: ScrollContainer,
) => {
  if (isWindowContainer(scrollContainer)) {
    return window.innerHeight;
  }

  return scrollContainer.getBoundingClientRect().bottom;
};

/**
 * 将鼠标滚轮的离散跳动转换为短距离缓动滚动。
 *
 * 动画时长和 easing 按参考视频控制在约 180ms，
 * 一次滚轮操作会先加速再减速；触控板连续输入时会合并目标位置，
 * 不会叠加多个独立动画。
 */
export const useSmoothWheelScroll = (
  rootRef: RefObject<HTMLElement>,
  enabled: boolean,
) => {
  useEffect(() => {
    const root = rootRef.current;

    if (!enabled || !root) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
    ) {
      return;
    }

    const scrollContainer = findScrollContainer(root);

    let animationFrameId = 0;
    let targetScrollTop = getScrollTop(scrollContainer);

    const stopAnimation = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
      targetScrollTop = getScrollTop(scrollContainer);
    };

    const startAnimation = () => {
      window.cancelAnimationFrame(animationFrameId);

      const startScrollTop = getScrollTop(scrollContainer);
      const distance = targetScrollTop - startScrollTop;

      if (Math.abs(distance) <= SCROLL_EPSILON) {
        setScrollTop(scrollContainer, targetScrollTop);
        animationFrameId = 0;
        return;
      }

      const startTime = window.performance.now();

      const step = (currentTime: number) => {
        const progress = clamp(
          (currentTime - startTime) / SMOOTH_SCROLL_DURATION,
          0,
          1,
        );

        setScrollTop(
          scrollContainer,
          startScrollTop + distance * easeInOutSine(progress),
        );

        if (progress < 1) {
          animationFrameId = window.requestAnimationFrame(step);
          return;
        }

        animationFrameId = 0;
        targetScrollTop = getScrollTop(scrollContainer);
      };

      animationFrameId = window.requestAnimationFrame(step);
    };

    const handleWheel = (event: WheelEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.shiftKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        Math.abs(event.deltaY) < 0.01
      ) {
        return;
      }

      const target =
        event.target instanceof HTMLElement
          ? event.target
          : null;

      if (!target || !root.contains(target)) {
        return;
      }

      if (shouldUseNestedScroll(target, root, event.deltaY)) {
        return;
      }

      const currentScrollTop = getScrollTop(scrollContainer);
      const baseScrollTop = animationFrameId
        ? targetScrollTop
        : currentScrollTop;

      const deltaY = normalizeWheelDelta(
        event,
        getScrollViewportHeight(scrollContainer),
      );

      const nextScrollTop = clamp(
        baseScrollTop + deltaY,
        0,
        getMaxScrollTop(scrollContainer),
      );

      if (
        Math.abs(nextScrollTop - currentScrollTop) <=
          SCROLL_EPSILON &&
        Math.abs(nextScrollTop - targetScrollTop) <=
          SCROLL_EPSILON
      ) {
        return;
      }

      event.preventDefault();
      targetScrollTop = nextScrollTop;
      startAnimation();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) {
        stopAnimation();
      }
    };

    scrollContainer.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    scrollContainer.addEventListener(
      "pointerdown",
      stopAnimation,
      { passive: true },
    );

    scrollContainer.addEventListener(
      "touchstart",
      stopAnimation,
      { passive: true },
    );

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      stopAnimation();

      scrollContainer.removeEventListener(
        "wheel",
        handleWheel,
      );

      scrollContainer.removeEventListener(
        "pointerdown",
        stopAnimation,
      );

      scrollContainer.removeEventListener(
        "touchstart",
        stopAnimation,
      );

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, rootRef]);
};
