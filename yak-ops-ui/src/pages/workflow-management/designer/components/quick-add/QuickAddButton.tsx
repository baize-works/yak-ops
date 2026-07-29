import { Plus } from 'lucide-react';
import type { MouseEvent } from 'react';

interface QuickAddButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'node' | 'edge' | 'panel';
  className?: string;
  alwaysVisible?: boolean;
}

const QuickAddButton = ({
  label,
  onClick,
  variant = 'node',
  className = '',
  alwaysVisible = false,
}: QuickAddButtonProps) => {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  };

  if (variant === 'panel') {
    return (
      <button
        type="button"
        aria-label={label}
        className={[
          'group flex min-h-[38px] w-full items-center justify-center gap-1.5',
          'rounded-lg border border-dashed border-[#d0d5dd] bg-[#f9fafb]',
          'px-3 text-[12px] font-medium text-[#667085]',
          'transition-colors duration-150',
          'hover:border-[#84adff] hover:bg-[#f5f8ff] hover:text-[#155eef]',
          className,
        ].join(' ')}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={handleClick}
      >
        <Plus size={14} strokeWidth={2.2} />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        'nodrag nopan nowheel group/quick-add flex items-center justify-center',
        'border-0 bg-transparent p-0 outline-none',
        'transition-[opacity,transform] duration-150',
        variant === 'edge' ? 'h-11 w-11' : 'h-8 w-8',
        alwaysVisible ? 'opacity-100' : 'opacity-0 hover:opacity-100 focus-visible:opacity-100',
        className,
      ].join(' ')}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={handleClick}
    >
      <span
        className={[
          'flex items-center justify-center rounded-full border bg-white',
          'text-[#155eef] shadow-[0_4px_12px_rgba(16,24,40,0.14)]',
          'transition-[border-color,background-color,box-shadow,transform] duration-150',
          'group-hover/quick-add:border-[#84adff]',
          'group-hover/quick-add:bg-[#f5f8ff]',
          'group-hover/quick-add:shadow-[0_5px_16px_rgba(21,94,239,0.18)]',
          'group-active/quick-add:scale-95',
          variant === 'edge'
            ? 'h-7 w-7 border-[#b2ccff]'
            : 'h-7 w-7 border-[#d0d5dd]',
        ].join(' ')}
      >
        <Plus size={15} strokeWidth={2.5} />
      </span>
    </button>
  );
};

export default QuickAddButton;
