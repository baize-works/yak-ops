import { Button, Input } from 'antd';
import {
  Plus,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface PanelSectionProps {
  title: string;
  description?: string;
  operation?: ReactNode;
  children: ReactNode;
}

export const PanelSection = ({
  title,
  description,
  operation,
  children,
}: PanelSectionProps) => {
  return (
    <section className="border-b border-[#eaecf0] last:border-b-0">
      <div
        className={[
          'flex min-h-[44px] items-center justify-between',
          'gap-3 px-4',
        ].join(' ')}
      >
        <div className="min-w-0">
          <h3 className="m-0 text-[13px] font-semibold leading-5 text-[#344054]">
            {title}
          </h3>

          {description && (
            <p className="mb-0 mt-0.5 text-[12px] leading-[18px] text-[#98a2b3]">
              {description}
            </p>
          )}
        </div>

        {operation && (
          <div className="shrink-0">
            {operation}
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {children}
      </div>
    </section>
  );
};

interface PanelFieldProps {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export const PanelField = ({
  label,
  hint,
  required,
  children,
}: PanelFieldProps) => {
  return (
    <label
      className={[
        'mb-3 block last:mb-0',
        '[&_.ant-input]:w-full',
        '[&_.ant-input]:text-[13px]',
        '[&_.ant-input-number]:w-full',
        '[&_.ant-input-number]:text-[13px]',
        '[&_.ant-select]:w-full',
        '[&_.ant-select]:text-[13px]',
        '[&_.ant-input-affix-wrapper]:w-full',
        '[&_.ant-input-affix-wrapper]:text-[13px]',
      ].join(' ')}
    >
      <span
        className={[
          'mb-1.5 flex items-center gap-1',
          'text-[12px] font-medium text-[#475467]',
        ].join(' ')}
      >
        {label}

        {required && (
          <span className="text-[#d92d20]">
            *
          </span>
        )}

        {hint && (
          <small className="font-normal text-[#98a2b3]">
            {hint}
          </small>
        )}
      </span>

      {children}
    </label>
  );
};

interface AddButtonProps {
  children?: ReactNode;
  onClick: () => void;
  iconOnly?: boolean;
  title?: string;
}

export const AddButton = ({
  children,
  onClick,
  iconOnly = false,
  title = '添加',
}: AddButtonProps) => {
  if (iconOnly) {
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        className={[
          'flex h-7 w-7 items-center justify-center',
          'rounded-md border-0 bg-transparent',
          'text-[#667085]',
          'transition-colors duration-150',
          'hover:bg-[#f2f4f7]',
          'hover:text-[#155eef]',
        ].join(' ')}
      >
        <Plus size={15} strokeWidth={2} />
      </button>
    );
  }

  return (
    <Button
      type="text"
      size="small"
      icon={<Plus size={14} />}
      onClick={onClick}
      className={[
        '!h-7 !rounded-md !px-2',
        '!text-[12px] !font-medium',
        '!text-[#155eef]',
        'hover:!bg-[#eef4ff]',
      ].join(' ')}
    >
      {children}
    </Button>
  );
};

export const RowDeleteButton = ({
  onClick,
}: {
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      aria-label="删除"
      onClick={onClick}
      className={[
        'flex h-7 w-7 shrink-0 items-center justify-center',
        'rounded-md border-0 bg-transparent',
        'text-[#98a2b3] opacity-0',
        'transition-[background-color,color,opacity] duration-150',
        'group-hover:opacity-100',
        'hover:bg-[#fef3f2]',
        'hover:text-[#d92d20]',
        'focus:opacity-100',
      ].join(' ')}
    >
      <Trash2 size={14} strokeWidth={1.8} />
    </button>
  );
};

interface KeyValueEditorProps {
  value: unknown;
  onChange: (value: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export const KeyValueEditor = ({
  value,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueEditorProps) => {
  const entries = toEntries(value);

  const updateEntry = (
    index: number,
    field: 'key' | 'value',
    nextValue: string,
  ) => {
    const nextEntries = entries.map((entry) => ({
      ...entry,
    }));

    nextEntries[index][field] = nextValue;

    onChange(toRecord(nextEntries));
  };

  const removeEntry = (index: number) => {
    onChange(
      toRecord(
        entries.filter(
          (_, currentIndex) => currentIndex !== index,
        ),
      ),
    );
  };

  const addEntry = () => {
    onChange(
      toRecord([
        ...entries,
        {
          key: `key_${entries.length + 1}`,
          value: '',
        },
      ]),
    );
  };

  return (
    <div
      className={[
        'overflow-hidden rounded-lg',
        'border border-[#e4e7ec] bg-white',
        'shadow-[0_1px_2px_rgba(16,24,40,0.03)]',
      ].join(' ')}
    >
      {entries.map((entry, index) => (
        <div
          key={`${entry.key}-${index}`}
          className={[
            'group grid min-h-[40px]',
            'grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_30px]',
            'items-center gap-1',
            'border-b border-[#f2f4f7]',
            'px-2 last:border-b-0',
          ].join(' ')}
        >
          <Input
            bordered={false}
            value={entry.key}
            placeholder={keyPlaceholder}
            className="!text-[12px]"
            onChange={(event) =>
              updateEntry(
                index,
                'key',
                event.target.value,
              )
            }
          />

          <Input
            bordered={false}
            value={entry.value}
            placeholder={valuePlaceholder}
            className="!text-[12px]"
            onChange={(event) =>
              updateEntry(
                index,
                'value',
                event.target.value,
              )
            }
          />

          <RowDeleteButton
            onClick={() => removeEntry(index)}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addEntry}
        className={[
          'flex h-9 w-full items-center justify-center gap-1.5',
          'border-0 border-t border-[#f2f4f7]',
          'bg-[#fcfcfd]',
          'text-[12px] text-[#667085]',
          'transition-colors duration-150',
          'hover:bg-[#f8faff]',
          'hover:text-[#155eef]',
        ].join(' ')}
      >
        <Plus size={14} strokeWidth={2} />
        添加一项
      </button>
    </div>
  );
};

interface OutputVariablesProps {
  items: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

export const OutputVariables = ({
  items,
}: OutputVariablesProps) => {
  return (
    <div
      className={[
        'overflow-hidden rounded-lg',
        'border border-[#e4e7ec] bg-white',
      ].join(' ')}
    >
      {items.map((item) => (
        <div
          key={item.name}
          className={[
            'grid min-h-[40px]',
            'grid-cols-[100px_76px_minmax(0,1fr)]',
            'items-center gap-2',
            'border-b border-[#f2f4f7]',
            'px-3 py-2 last:border-b-0',
            'text-[12px]',
          ].join(' ')}
        >
          <code className="truncate font-medium text-[#344054]">
            {item.name}
          </code>

          <span className="truncate text-[#667085]">
            {item.type}
          </span>

          <span className="truncate text-[#98a2b3]">
            {item.description}
          </span>
        </div>
      ))}
    </div>
  );
};

const toEntries = (value: unknown) => {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return [];
  }

  return Object.entries(value).map(([key, item]) => ({
    key,
    value: String(item ?? ''),
  }));
};

const toRecord = (
  entries: Array<{
    key: string;
    value: string;
  }>,
) => {
  return Object.fromEntries(
    entries
      .map((entry) => ({
        key: entry.key.trim(),
        value: entry.value,
      }))
      .filter((entry) => entry.key)
      .map(
        (entry) =>
          [entry.key, entry.value] as const,
      ),
  );
};