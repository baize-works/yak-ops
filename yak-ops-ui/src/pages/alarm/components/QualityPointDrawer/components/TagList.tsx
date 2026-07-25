interface TagListProps {
  values: string[];
  emptyText?: string;
}

const TagList = ({
                   values,
                   emptyText = "暂无配置",
                 }: TagListProps) => {
  if (values.length === 0) {
    return (
      <span className="text-sm text-slate-400">
        {emptyText}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex min-h-7 items-center rounded-full bg-slate-100 px-2.5 text-xs font-medium text-slate-600"
        >
          {value}
        </span>
      ))}
    </div>
  );
};

export default TagList;
