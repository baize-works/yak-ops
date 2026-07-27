import {
  Button,
  Checkbox,
  Drawer,
  Empty,
  Input,
  Radio,
  Space,
  Spin,
} from 'antd';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface AssignmentOption {
  id: number;
  label: string;
  description?: string;
}

export interface AssignmentDrawerProps {
  open: boolean;
  title: string;
  mode: 'single' | 'multiple';
  options: AssignmentOption[];
  value: number[];
  loading?: boolean;
  allowEmpty?: boolean;
  onClose: () => void;
  onSubmit: (value: number[]) => Promise<void> | void;
}

export default function AssignmentDrawer(
  props: AssignmentDrawerProps,
) {
  const {
    open,
    title,
    mode,
    options,
    value,
    loading,
    allowEmpty = false,
    onClose,
    onSubmit,
  } = props;
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] =
    useState<number[]>(value);
  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    if (!open) return;

    setKeyword('');
    setSelected([...new Set(value)]);
  }, [open, value]);

  const visible = useMemo(
    () =>
      options.filter((option) =>
        `${option.label} ${option.description ?? ''}`
          .toLowerCase()
          .includes(keyword.trim().toLowerCase()),
      ),
    [keyword, options],
  );

  const submit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(selected);
    } finally {
      setSubmitting(false);
    }
  };

  const body = visible.length ? (
    visible.map((option) => (
      <div
        key={option.id}
        className="rounded-lg px-2 py-2 hover:bg-gray-50"
      >
        {mode === 'single' ? (
          <Radio
            checked={selected[0] === option.id}
            onChange={() => setSelected([option.id])}
          >
            {option.label}{' '}
            <span className="text-gray-400">
              {option.description}
            </span>
          </Radio>
        ) : (
          <Checkbox
            checked={selected.includes(option.id)}
            onChange={(event) =>
              setSelected(
                event.target.checked
                  ? [...new Set([...selected, option.id])]
                  : selected.filter(
                      (id) => id !== option.id,
                    ),
              )
            }
          >
            {option.label}{' '}
            <span className="text-gray-400">
              {option.description}
            </span>
          </Checkbox>
        )}
      </div>
    ))
  ) : (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description="无匹配用户"
    />
  );

  return (
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      width={420}
      maskClosable={!submitting}
      closable={!submitting}
      extra={
        <Space>
          <Button
            disabled={submitting}
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            type="primary"
            loading={submitting}
            disabled={
              Boolean(loading) ||
              (!allowEmpty && !selected.length)
            }
            onClick={() => void submit()}
          >
            确定
          </Button>
        </Space>
      }
    >
      <Input.Search
        allowClear
        value={keyword}
        placeholder="搜索用户名或姓名"
        className="mb-3"
        onChange={(event) =>
          setKeyword(event.target.value)
        }
      />
      <Spin spinning={Boolean(loading)}>
        {body}
      </Spin>
    </Drawer>
  );
}
