import {Button, Divider, Tooltip} from 'antd';
import {Focus, GitBranch, Hand, MousePointer2, Redo2, Undo2,} from 'lucide-react';
import type {ReactNode} from 'react';
import {useEffect} from 'react';

type CanvasControlMode = 'hand' | 'pointer';

interface CanvasToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  canDeleteEdge: boolean;
  controlMode: string;
  onControlModeChange: (mode: CanvasControlMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteEdge: () => void;
  onAutoLayout: () => void;
  onFitView: () => void;
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      [
        'input',
        'textarea',
        '[contenteditable="true"]',
        '[role="textbox"]',
        '.ant-input',
        '.ant-select-selection-search-input',
        '.cm-editor',
        '.monaco-editor',
      ].join(','),
    ),
  );
};

const TooltipShortcut = ({children}: { children: ReactNode }) => (
  <span
    className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded bg-[#f2f4f7] px-1.5 text-[11px] font-medium leading-none text-[#667085]">
    {children}
  </span>
);

const ToolbarTooltip = ({
                          children,
                          shortcut,
                          title,
                        }: {
  children: ReactNode;
  shortcut?: ReactNode;
  title: string;
}) => (
  <Tooltip
    align={{offset: [8, 0]}}
    arrow={false}
    placement="right"
    title={
      <span className="inline-flex items-center whitespace-nowrap">
        <span>{title}</span>
        {shortcut}
      </span>
    }
  >
    {children}
  </Tooltip>
);

export default function CanvasToolbar({
                                        canUndo,
                                        canRedo,
                                        canDeleteEdge,
                                        controlMode,
                                        onControlModeChange,
                                        onUndo,
                                        onRedo,
                                        onDeleteEdge,
                                        onAutoLayout,
                                        onFitView,
                                      }: CanvasToolbarProps) {
  const modeButtonClassName = (mode: CanvasControlMode) =>
    controlMode === mode
      ? '!inline-flex !h-7 !w-7 items-center justify-center rounded-md bg-[#eaf1ff] p-0 leading-none text-[#296dff] hover:bg-[#eaf1ff] hover:text-[#296dff]'
      : '!inline-flex !h-7 !w-7 items-center justify-center rounded-md p-0 leading-none text-[#667085] hover:bg-[#f2f4f7] hover:text-[#344054]';

  const toolbarButtonClassName =
    '!inline-flex !h-7 !w-7 items-center justify-center rounded-md p-0 leading-none text-[#667085] hover:bg-[#f2f4f7] hover:text-[#344054]';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const isModifierPressed = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (
        canDeleteEdge &&
        !isModifierPressed &&
        !event.altKey &&
        (key === 'delete' || key === 'backspace')
      ) {
        event.preventDefault();
        onDeleteEdge();
        return;
      }

      if (!isModifierPressed) return;

      if (key === 'z' && event.shiftKey) {
        if (!canRedo) return;

        event.preventDefault();
        onRedo();
        return;
      }

      if (key === 'z') {
        if (!canUndo) return;

        event.preventDefault();
        onUndo();
        return;
      }

      if (key === 'y') {
        if (!canRedo) return;

        event.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canDeleteEdge, canRedo, canUndo, onDeleteEdge, onRedo, onUndo]);

  return (
    <div
      className="absolute left-0.5 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-lg border border-solid border-[#eef2f7] bg-white px-1 py-2 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
      <ToolbarTooltip title="指针模式">
        <Button
          aria-label="指针模式"
          className={modeButtonClassName('pointer')}
          icon={<MousePointer2 size={16}/>}
          onClick={() => onControlModeChange('pointer')}
          size="small"
          type="text"
        />
      </ToolbarTooltip>
      <ToolbarTooltip title="手模式">
        <Button
          aria-label="手模式"
          className={modeButtonClassName('hand')}
          icon={<Hand size={16}/>}
          onClick={() => onControlModeChange('hand')}
          size="small"
          type="text"
        />
      </ToolbarTooltip>
      <Divider className="my-1 w-4 min-w-0 border-[#e4e7ec]"/>
      <ToolbarTooltip
        shortcut={
          <>
            <TooltipShortcut>Ctrl</TooltipShortcut>
            <TooltipShortcut>Z</TooltipShortcut>
          </>
        }
        title="撤销"
      >
        <Button
          aria-label="撤销"
          className={toolbarButtonClassName}
          disabled={!canUndo}
          icon={<Undo2 size={16}/>}
          onClick={onUndo}
          size="small"
          type="text"
        />
      </ToolbarTooltip>
      <ToolbarTooltip
        shortcut={
          <>
            <TooltipShortcut>Ctrl</TooltipShortcut>
            <TooltipShortcut>Shift</TooltipShortcut>
            <TooltipShortcut>Z</TooltipShortcut>
          </>
        }
        title="重做"
      >
        <Button
          aria-label="重做"
          className={toolbarButtonClassName}
          disabled={!canRedo}
          icon={<Redo2 size={16}/>}
          onClick={onRedo}
          size="small"
          type="text"
        />
      </ToolbarTooltip>
      <Divider className="my-1 w-4 min-w-0 border-[#e4e7ec]"/>
      <ToolbarTooltip title="自动布局">
        <Button
          aria-label="自动布局"
          className={toolbarButtonClassName}
          icon={<GitBranch size={16}/>}
          onClick={onAutoLayout}
          size="small"
          type="text"
        />
      </ToolbarTooltip>
      <ToolbarTooltip title="适应画布">
        <Button
          aria-label="适应画布"
          className={toolbarButtonClassName}
          icon={<Focus size={16}/>}
          onClick={onFitView}
          size="small"
          type="text"
        />
      </ToolbarTooltip>
    </div>
  );
}
