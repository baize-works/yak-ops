import { Input, Switch } from 'antd';
import { Eye, EyeOff, Plus, Trash2, X } from 'lucide-react';
import type { WorkflowVariable } from '../../../types';
import {
  PanelTitle,
  panelContentClass,
  panelHeaderClass,
  panelIconButtonClass,
  panelShellClass,
} from './shared';

interface VariablePanelProps {
  title: string;
  description: string;
  variables: WorkflowVariable[];
  environment?: boolean;
  onChange: (variables: WorkflowVariable[]) => void;
  onClose: () => void;
}

const VariablePanel = ({
  title,
  description,
  variables,
  environment = false,
  onChange,
  onClose,
}: VariablePanelProps) => {
  const patch = (id: string, values: Partial<WorkflowVariable>) => {
    onChange(
      variables.map((item) => (item.id === id ? { ...item, ...values } : item)),
    );
  };

  const add = () => {
    const id = `var_${Date.now().toString(36)}`;
    onChange([
      ...variables,
      { id, name: '', value: '', description: '', secret: environment },
    ]);
  };

  return (
    <aside className={panelShellClass}>
      <header className={panelHeaderClass}>
        <PanelTitle title={title} description={description} />
        <button type="button" className={panelIconButtonClass} onClick={onClose}>
          <X size={17} />
        </button>
      </header>

      <div className={[panelContentClass, 'p-3.5'].join(' ')}>
        <div className="mb-3 flex items-center justify-between text-[9px] text-[#98a2b3]">
          <span>{variables.length} 个变量</span>
          <button
            type="button"
            onClick={add}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[#d0d5dd] bg-white px-2 text-[9px] text-[#475467] hover:bg-[#f9fafb]"
          >
            <Plus size={14} /> 添加变量
          </button>
        </div>

        {variables.length ? (
          <div className="flex flex-col gap-2">
            {variables.map((variable, index) => (
              <article
                key={variable.id}
                className="grid grid-cols-[22px_minmax(0,1fr)_28px] items-start gap-2 rounded-lg border border-[#e4e7ec] bg-[#fcfcfd] p-2.5"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#f2f4f7] text-[9px] text-[#667085]">
                  {index + 1}
                </div>
                <div className="grid gap-1.5 [&_.ant-input]:text-[10px] [&_.ant-input-affix-wrapper]:text-[10px]">
                  <Input
                    value={variable.name}
                    placeholder="变量名"
                    onChange={(event) => patch(variable.id, { name: event.target.value })}
                  />
                  {environment && variable.secret ? (
                    <Input.Password
                      value={variable.value}
                      placeholder="敏感变量值"
                      onChange={(event) => patch(variable.id, { value: event.target.value })}
                    />
                  ) : (
                    <Input
                      value={variable.value}
                      placeholder={environment ? '变量值' : '默认值'}
                      onChange={(event) => patch(variable.id, { value: event.target.value })}
                    />
                  )}
                  <Input
                    value={variable.description}
                    placeholder="描述（可选）"
                    onChange={(event) =>
                      patch(variable.id, { description: event.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  {environment && (
                    <button
                      type="button"
                      title={variable.secret ? '设为普通变量' : '设为敏感变量'}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-md border-0 bg-transparent text-[#667085] hover:bg-[#f2f4f7]"
                      onClick={() => patch(variable.id, { secret: !variable.secret })}
                    >
                      {variable.secret ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-md border-0 bg-transparent text-[#d92d20] hover:bg-[#fef3f2]"
                    onClick={() =>
                      onChange(variables.filter((item) => item.id !== variable.id))
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="flex min-h-[210px] w-full flex-col items-center justify-center rounded-[10px] border border-dashed border-[#d0d5dd] bg-[#fcfcfd] text-[#98a2b3]"
            onClick={add}
          >
            <Plus size={18} />
            <strong className="mt-2.5 text-[11px] text-[#475467]">
              添加第一个变量
            </strong>
            <span className="mt-1 text-[9px]">
              变量可以在节点配置中使用双大括号引用。
            </span>
          </button>
        )}

        {environment && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#f8f9fb] p-2.5 text-[9px] text-[#667085]">
            <Switch size="small" checked />
            敏感值只保存在当前浏览器的本地工作区中。
          </div>
        )}
      </div>
    </aside>
  );
};

export default VariablePanel;
