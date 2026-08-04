import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';

interface WorkbenchResizeHandleProps {
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  ariaLabel: string;
  onChange: (value: number) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const WorkbenchResizeHandle = ({
  value,
  min,
  max,
  defaultValue,
  ariaLabel,
  onChange,
}: WorkbenchResizeHandleProps) => {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      cleanupRef.current?.();
    },
    [],
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    event.preventDefault();
    const startX = event.clientX;
    const startValue = value;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      onChange(clamp(startValue + moveEvent.clientX - startX, min, max));
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      cleanupRef.current = null;
    };

    cleanupRef.current?.();
    cleanupRef.current = cleanup;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', cleanup);
    window.addEventListener('pointercancel', cleanup);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 40 : 12;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onChange(clamp(value - step, min, max));
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onChange(clamp(value + step, min, max));
    }

    if (event.key === 'Home') {
      event.preventDefault();
      onChange(min);
    }

    if (event.key === 'End') {
      event.preventDefault();
      onChange(max);
    }
  };

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onDoubleClick={() => onChange(defaultValue)}
      onKeyDown={handleKeyDown}
      className="group relative z-20 h-full w-[5px] shrink-0 cursor-col-resize touch-none bg-transparent outline-none"
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#e5e7ea] transition-[width,background-color] group-hover:w-[3px] group-hover:bg-[var(--yak-brand-color)] group-focus-visible:w-[3px] group-focus-visible:bg-[var(--yak-brand-color)]" />
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent transition-colors group-hover:bg-[var(--yak-brand-color-soft-hover)] group-focus-visible:bg-[var(--yak-brand-color-soft-hover)]" />
    </div>
  );
};

export default WorkbenchResizeHandle;
