import LegendaryCursor from "legendary-cursor";
import {useEffect} from "react";

type LegendaryCursorOptions = {
  lineSize?: number;
  opacityDecrement?: number;
  speedExpFactor?: number;
  lineExpFactor?: number;
  sparkleCount?: number;
  maxOpacity?: number;
  texture1?: string;
  texture2?: string;
  texture3?: string;
};

type Props = {
  enabled?: boolean;

  options?: LegendaryCursorOptions;

  singletonKey?: string;

  desktopOnly?: boolean;
};

export default function LegendaryCursorEffect({
                                                enabled = true,
                                                options,
                                                singletonKey = "legendary-cursor-singleton",
                                                desktopOnly = true,
                                              }: Props) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    if (desktopOnly) {
      const isTouch =
        "ontouchstart" in window ||
        (navigator as any).maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0;
      if (isTouch) return;
    }

    const w = window as any;
    if (w.__legendaryCursorInitialized?.[singletonKey]) return;

    const defaultOptions: LegendaryCursorOptions = {
      lineSize: 0.04,
      opacityDecrement: 0.45,
      speedExpFactor: 0.9,
      lineExpFactor: 0.7,
      sparkleCount: 80,
      maxOpacity: 0.9,
      texture1: "/stars.jpg",
      texture2: "/nebula.png",
    };

    const merged = {...defaultOptions, ...(options || {})};

    try {
      LegendaryCursor.init(merged as any);
      w.__legendaryCursorInitialized = w.__legendaryCursorInitialized || {};
      w.__legendaryCursorInitialized[singletonKey] = true;
    } catch (e) {
      console.error("[LegendaryCursorEffect] init failed:", e);
    }

    return () => {
    };
  }, [enabled, options, singletonKey, desktopOnly]);

  return null;
}
