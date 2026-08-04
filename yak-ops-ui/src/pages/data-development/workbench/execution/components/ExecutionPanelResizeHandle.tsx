import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

interface ExecutionPanelResizeHandleProps {
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  onChange: (value: number) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const ExecutionPanelResizeHandle = ({
  value,
  min,
  max,
  defaultValue,
  onChange,
}: ExecutionPanelResizeHandleProps) => {
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
    const startY = event.clientY;
    const startValue = value;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      onChange(clamp(startValue + startY - moveEvent.clientY, min, max));
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

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(clamp(value + step, min, max));
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(clamp(value - step, min, max));
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
      aria-label="调整运行结果面板高度"
      aria-orientation="horizontal"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onDoubleClick={() => onChange(defaultValue)}
      onKeyDown={handleKeyDown}
      className="group absolute inset-x-0 top-0 z-30 h-[6px] -translate-y-1/2 cursor-row-resize touch-none bg-transparent outline-none"
    >
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#dfe2e6] transition-[height,background-color] group-hover:h-[3px] group-hover:bg-[var(--yak-brand-color)] group-focus-visible:h-[3px] group-focus-visible:bg-[var(--yak-brand-color)]" />
    </div>
  );
};

export default ExecutionPanelResizeHandle;
