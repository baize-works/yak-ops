import { Button, Input } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
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
}: PanelSectionProps) => (
  <section className="border-b border-[#f0f1f4] px-4 py-4 last:border-b-0">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 className="m-0 text-[11px] font-semibold text-[#344054]">
          {title}
        </h3>
        {description && (
          <p className="mb-0 mt-1 text-[9px] leading-[15px] text-[#98a2b3]">
            {description}
          </p>
        )}
      </div>
      {operation}
    </div>
    {children}
  </section>
);

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
}: PanelFieldProps) => (
  <label
    className={[
      'mb-3 block last:mb-0',
      '[&_.ant-input]:w-full [&_.ant-input]:text-[11px]',
      '[&_.ant-input-number]:w-full [&_.ant-input-number]:text-[11px]',
      '[&_.ant-select]:w-full [&_.ant-select]:text-[11px]',
      '[&_.ant-input-affix-wrapper]:w-full [&_.ant-input-affix-wrapper]:text-[11px]',
    ].join(' ')}
  >
    <span className="mb-1.5 flex items-center gap-1 text-[9px] font-semibold text-[#667085]">
      {label}
      {required && <span className="text-[#d92d20]">*</span>}
      {hint && <small className="font-normal text-[#98a2b3]">{hint}</small>}
    </span>
    {children}
  </label>
);

export const AddButton = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) => (
  <Button
    type="text"
    size="small"
    icon={<Plus size={13} />}
    onClick={onClick}
    className="!h-7 !px-2 !text-[10px] !text-[#155eef]"
  >
    {children}
  </Button>
);

export const RowDeleteButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    aria-label="删除"
    onClick={onClick}
    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-[#98a2b3] hover:bg-[#fff1f0] hover:text-[#d92d20]"
  >
    <Trash2 size={14} />
  </button>
);

export const KeyValueEditor = ({
  value,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: {
  value: unknown;
  onChange: (value: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) => {
  const entries = toEntries(value);

  const updateEntry = (
    index: number,
    field: 'key' | 'value',
    nextValue: string,
  ) => {
    const next = entries.map((entry) => ({ ...entry }));
    next[index][field] = nextValue;
    onChange(toRecord(next));
  };

  const removeEntry = (index: number) => {
    onChange(toRecord(entries.filter((_, current) => current !== index)));
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#e4e7ec]">
      {entries.map((entry, index) => (
        <div
          key={`${entry.key}-${index}`}
          className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_30px] gap-1 border-b border-[#f2f4f7] p-1.5 last:border-b-0"
        >
          <Input
            bordered={false}
            value={entry.key}
            placeholder={keyPlaceholder}
            onChange={(event) => updateEntry(index, 'key', event.target.value)}
          />
          <Input
            bordered={false}
            value={entry.value}
            placeholder={valuePlaceholder}
            onChange={(event) =>
              updateEntry(index, 'value', event.target.value)
            }
          />
          <RowDeleteButton onClick={() => removeEntry(index)} />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange(
            toRecord([
              ...entries,
              { key: `key_${entries.length + 1}`, value: '' },
            ]),
          )
        }
        className="flex h-8 w-full items-center justify-center gap-1 border-0 bg-[#fcfcfd] text-[10px] text-[#667085] hover:bg-[#f5f8ff] hover:text-[#155eef]"
      >
        <Plus size={13} />
        添加一项
      </button>
    </div>
  );
};

export const OutputVariables = ({
  items,
}: {
  items: Array<{ name: string; type: string; description: string }>;
}) => (
  <div className="overflow-hidden rounded-lg border border-[#e4e7ec] bg-[#fcfcfd]">
    {items.map((item) => (
      <div
        key={item.name}
        className="grid grid-cols-[90px_72px_minmax(0,1fr)] gap-2 border-b border-[#f2f4f7] px-2.5 py-2 text-[9px] last:border-b-0"
      >
        <code className="font-semibold text-[#344054]">{item.name}</code>
        <span className="text-[#667085]">{item.type}</span>
        <span className="text-[#98a2b3]">{item.description}</span>
      </div>
    ))}
  </div>
);

const toEntries = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).map(([key, item]) => ({
    key,
    value: String(item ?? ''),
  }));
};

const toRecord = (entries: Array<{ key: string; value: string }>) =>
  Object.fromEntries(
    entries
      .map((entry) => ({ key: entry.key.trim(), value: entry.value }))
      .filter((entry) => entry.key)
      .map((entry) => [entry.key, entry.value] as const),
  );
