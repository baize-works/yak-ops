import type {ReactNode} from "react";
import TagList from "./TagList";

interface RelationItemProps {
  icon: ReactNode;
  label: string;
  values: string[];
}

const RelationItem = ({
                        icon,
                        label,
                        values,
                      }: RelationItemProps) => {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-1 flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500">
        {icon}
        <span>{label}</span>
      </div>

      <div className="min-w-0 flex-1">
        <TagList values={values}/>
      </div>
    </div>
  );
};

export default RelationItem;
