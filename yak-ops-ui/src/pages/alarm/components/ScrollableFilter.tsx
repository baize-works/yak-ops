import {ChevronLeft, ChevronRight} from "lucide-react";
import React, {useCallback, useEffect, useRef, useState} from "react";

export interface FilterOption<T extends string = string> {
  label: string;
  value: T;
}

interface ScrollableFilterProps<T extends string = string> {
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

const ScrollableFilter = <T extends string>({
                                              value,
                                              options,
                                              onChange,
                                              className = "",
                                            }: ScrollableFilterProps<T>) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const maxScrollLeft = element.scrollWidth - element.clientWidth;

    setCanScrollLeft(element.scrollLeft > 4);
    setCanScrollRight(element.scrollLeft < maxScrollLeft - 4);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    updateScrollState();

    element.addEventListener("scroll", updateScrollState, {passive: true});

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [options, updateScrollState]);

  const handleScroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -260 : 260,
      behavior: "smooth",
    });
  };

  return (
    <div className={`group relative min-w-0 ${className}`}>
      <div
        className={[
          "pointer-events-none absolute inset-y-0 left-0 z-10",
          "flex w-16 items-center",
          "bg-gradient-to-r from-white via-white/90 to-transparent",
          "transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <button
          type="button"
          aria-label="向左查看更多筛选项"
          onClick={() => handleScroll("left")}
          className={[
            "pointer-events-auto ml-1 inline-flex h-8 w-8",
            "items-center justify-center rounded-full",
            "border border-slate-200 bg-white text-slate-500",
            "shadow-sm transition-all duration-200",
            "hover:border-slate-300 hover:text-slate-900",
            "active:scale-95",
          ].join(" ")}
        >
          <ChevronLeft className="h-4 w-4"/>
        </button>
      </div>

      <div
        className={[
          "pointer-events-none absolute inset-y-0 right-0 z-10",
          "flex w-16 items-center justify-end",
          "bg-gradient-to-l from-white via-white/90 to-transparent",
          "transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <button
          type="button"
          aria-label="向右查看更多筛选项"
          onClick={() => handleScroll("right")}
          className={[
            "pointer-events-auto mr-1 inline-flex h-8 w-8",
            "items-center justify-center rounded-full",
            "border border-slate-200 bg-white text-slate-500",
            "shadow-sm transition-all duration-200",
            "hover:border-slate-300 hover:text-slate-900",
            "active:scale-95",
          ].join(" ")}
        >
          <ChevronRight className="h-4 w-4"/>
        </button>
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar overflow-x-auto scroll-smooth py-1"
      >
        <div className="flex min-w-max items-center justify-center gap-2 px-1">
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={[
                  "inline-flex h-9 shrink-0 items-center justify-center",
                  "rounded-full px-4 text-sm font-medium",
                  "transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-slate-300 focus-visible:ring-offset-2",
                  active
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ScrollableFilter;
