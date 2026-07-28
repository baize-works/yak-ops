import { Input, Switch } from 'antd';
import { Eye, EyeOff, Plus, Trash2, X } from 'lucide-react';
import type { WorkflowVariable } from '../../types';

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
    onChange(variables.map((item) => (item.id === id ? { ...item, ...values } : item)));
  };

  const add = () => {
    const id = `var_${Date.now().toString(36)}`;
    onChange([
      ...variables,
      { id, name: '', value: '', description: '', secret: environment },
    ]);
  };

  return (
    <aside className="dify-workspace-panel">
      <header>
        <div>
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
        <button type="button" onClick={onClose}><X size={17} /></button>
      </header>

      <div className="dify-workspace-panel__content">
        <div className="dify-variable-panel__toolbar">
          <span>{variables.length} 个变量</span>
          <button type="button" onClick={add}><Plus size={14} /> 添加变量</button>
        </div>

        {variables.length ? (
          <div className="dify-variable-list">
            {variables.map((variable, index) => (
              <article key={variable.id}>
                <div className="dify-variable-list__index">{index + 1}</div>
                <div className="dify-variable-list__fields">
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
                    onChange={(event) => patch(variable.id, { description: event.target.value })}
                  />
                </div>
                <div className="dify-variable-list__actions">
                  {environment && (
                    <button
                      type="button"
                      title={variable.secret ? '设为普通变量' : '设为敏感变量'}
                      onClick={() => patch(variable.id, { secret: !variable.secret })}
                    >
                      {variable.secret ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() => onChange(variables.filter((item) => item.id !== variable.id))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <button type="button" className="dify-variable-empty" onClick={add}>
            <Plus size={18} />
            <strong>添加第一个变量</strong>
            <span>变量可以在节点配置中使用双大括号引用。</span>
          </button>
        )}

        {environment && (
          <div className="dify-variable-panel__tip">
            <Switch size="small" checked />
            敏感值只保存在当前浏览器的本地工作区中。
          </div>
        )}
      </div>
    </aside>
  );
};

export default VariablePanel;
