import { API_SUCCESS_CODE } from '@/services/http/response';
import { useIntl } from '@umijs/max';
import { Button, Form, message, Modal } from 'antd';
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { dataSourceGroupList } from '../constants';
import DatabaseIcons from '../icon/DatabaseIcons';
import {
  createDataSource,
  testDataSourceConnectionWithParams,
  updateDataSource,
} from '../service';
import type {
  DataSourceFormValues,
  DataSourceModalOpenPayload,
  DataSourceModalRef,
  DataSourceRecord,
} from '../types';
import { DataSourceOperateType } from '../types';
import { buildSubmitPayload, parseOriginalJson } from '../utils';
import DataSourceTypeSelector from './DataSourceTypeSelector';
import DynamicDataSourceForm from './DynamicDataSourceForm';

const AddOrEditDataSourceModal = forwardRef<DataSourceModalRef>((_, ref) => {
  const intl = useIntl();
  const [basicForm] = Form.useForm<DataSourceFormValues>();
  const [configForm] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [operateType, setOperateType] = useState(DataSourceOperateType.Create);
  const [currentRecord, setCurrentRecord] = useState<DataSourceRecord>();
  const [selectedDbType, setSelectedDbType] = useState('');
  const [showFormStep, setShowFormStep] = useState(false);
  const [hideBackButton, setHideBackButton] = useState(false);
  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const successCallbackRef = useRef<(() => void) | undefined>();

  const isCreateMode = operateType === DataSourceOperateType.Create;
  const isEditMode = operateType === DataSourceOperateType.Edit;
  const busy = testing || submitting;

  const resetModalState = () => {
    setCurrentRecord(undefined);
    setSelectedDbType('');
    setShowFormStep(false);
    setHideBackButton(false);
    setTesting(false);
    setSubmitting(false);
    successCallbackRef.current = undefined;
    basicForm.resetFields();
    configForm.resetFields();
  };

  const handleClose = () => {
    if (busy) return;
    setOpen(false);
    resetModalState();
  };

  const initializeEditForm = (record: DataSourceRecord) => {
    basicForm.setFieldsValue({
      name: record.name || '',
      environment: record.environment || '',
      remark: record.remark || '',
    });
  };

  useImperativeHandle(ref, () => ({
    open: ({
      operateType: nextOperateType,
      currentRecord: nextRecord,
      onSuccess,
      dbType,
      hideBack,
    }: DataSourceModalOpenPayload) => {
      resetModalState();
      successCallbackRef.current = onSuccess;
      setOpen(true);
      setOperateType(nextOperateType);
      setCurrentRecord(nextRecord);

      if (nextOperateType === DataSourceOperateType.Edit && nextRecord) {
        setSelectedDbType(nextRecord.dbType || '');
        setShowFormStep(true);
        setHideBackButton(true);
        initializeEditForm(nextRecord);
        return;
      }

      if (nextOperateType === DataSourceOperateType.Create && dbType) {
        setSelectedDbType(dbType);
        setShowFormStep(true);
        setHideBackButton(Boolean(hideBack));
        return;
      }

      setSelectedDbType('');
      setShowFormStep(false);
      setHideBackButton(false);
    },
    close: handleClose,
  }));

  const handleSelectDbType = (dbType: string) => {
    basicForm.resetFields();
    configForm.resetFields();
    setSelectedDbType(dbType);
    setShowFormStep(true);
    setHideBackButton(false);
  };

  const handleBackToTypeSelection = () => {
    if (busy) return;
    setShowFormStep(false);
    setSelectedDbType('');
    setHideBackButton(false);
    basicForm.resetFields();
    configForm.resetFields();
  };

  const handleTestConnection = async () => {
    if (testing || submitting) return;
    try {
      setTesting(true);
      const connectionValues = await configForm.validateFields();
      const response = await testDataSourceConnectionWithParams({
        dataSourceId: isEditMode ? currentRecord?.id : undefined,
        dbType: selectedDbType,
        connJson: JSON.stringify({
          ...connectionValues,
          dbType: selectedDbType,
        }),
      });

      if (response.code === API_SUCCESS_CODE && response.data === true) {
        message.success('连接测试成功');
      }
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'errorFields' in error
      ) {
        return;
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting || testing) return;
    try {
      setSubmitting(true);
      const basicValues = await basicForm.validateFields();
      const connectionValues = await configForm.validateFields();
      const payload = buildSubmitPayload(
        selectedDbType,
        basicValues,
        connectionValues,
      );

      const response = isCreateMode
        ? await createDataSource(payload)
        : currentRecord?.id
          ? await updateDataSource(currentRecord.id, payload)
          : undefined;
      if (!response || response.code !== API_SUCCESS_CODE) return;

      const successCallback = successCallbackRef.current;
      message.success(isCreateMode ? '数据源创建成功' : '数据源更新成功');
      setSubmitting(false);
      setOpen(false);
      resetModalState();
      successCallback?.();
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'errorFields' in error
      ) {
        return;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const modalActionText = isEditMode
    ? intl.formatMessage({
        id: 'pages.datasource.modal.title.edit',
        defaultMessage: 'Edit',
      })
    : intl.formatMessage({
        id: 'pages.datasource.modal.title.add',
        defaultMessage: 'Add',
      });

  return (
    <Modal
      width="67vw"
      open={open}
      centered
      maskClosable={false}
      closable={!busy}
      keyboard={!busy}
      onCancel={handleClose}
      destroyOnClose
      styles={{
        header: {
          padding: '20px 24px 16px',
          borderBottom: '1px solid #EEF2F6',
          marginBottom: 0,
        },
        body: {
          padding: '20px 24px 16px',
          background: '#F8FAFC',
          maxHeight: '69vh',
          overflowY: 'auto',
          minHeight: '65vh',
        },
        footer: {
          padding: '14px 24px 18px',
          borderTop: '1px solid #EEF2F6',
          background: '#FFFFFF',
          marginTop: 0,
        },
        content: {
          borderRadius: 20,
          overflow: 'hidden',
        },
      }}
      title={
        <div className="flex items-center justify-between gap-3 pr-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#EEF4FF]">
              <DatabaseIcons dbType={selectedDbType} width="18" height="18" />
            </div>
            <div className="min-w-0">
              <div className="text-[18px] font-semibold leading-7 text-[#101828]">
                {modalActionText}
                {intl.formatMessage({
                  id: 'pages.datasource.common.title',
                  defaultMessage: ' Data Source',
                })}
              </div>
              <div className="mt-0.5 text-[13px] leading-5 text-[#667085]">
                {selectedDbType
                  ? `当前类型：${selectedDbType}`
                  : '请选择数据源类型'}
              </div>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <div>
            {showFormStep && isCreateMode && !hideBackButton ? (
              <Button
                disabled={busy}
                onClick={handleBackToTypeSelection}
                style={{ height: 32, borderRadius: 16 }}
              >
                上一步
              </Button>
            ) : (
              <Button
                disabled={busy}
                onClick={handleClose}
                style={{ height: 32, borderRadius: 16 }}
              >
                取消
              </Button>
            )}
          </div>

          {showFormStep && (
            <div className="flex gap-2.5">
              <Button
                loading={testing}
                disabled={submitting}
                onClick={() => void handleTestConnection()}
                style={{ height: 32, borderRadius: 16 }}
              >
                连接测试
              </Button>
              <Button
                type="primary"
                loading={submitting}
                disabled={testing}
                onClick={() => void handleSubmit()}
                style={{ height: 32, borderRadius: 16, paddingInline: 18 }}
              >
                完成
              </Button>
            </div>
          )}
        </div>
      }
    >
      {showFormStep ? (
        <DynamicDataSourceForm
          key={`${operateType}-${selectedDbType}-${currentRecord?.id || 'create'}`}
          dbType={selectedDbType}
          form={basicForm}
          configForm={configForm}
          operateType={operateType}
          initialConfig={
            isEditMode
              ? parseOriginalJson(currentRecord?.originalJson)
              : undefined
          }
        />
      ) : (
        <div className="py-1 pb-2">
          <DataSourceTypeSelector
            dataSourceGroups={dataSourceGroupList}
            onSelect={handleSelectDbType}
          />
        </div>
      )}
    </Modal>
  );
});

AddOrEditDataSourceModal.displayName = 'AddOrEditDataSourceModal';

export default AddOrEditDataSourceModal;
