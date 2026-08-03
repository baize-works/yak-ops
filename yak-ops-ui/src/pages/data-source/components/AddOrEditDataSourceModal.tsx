import { API_SUCCESS_CODE } from "@/services/http/response";
import { useIntl } from "@umijs/max";
import { Button, Form, message, Modal } from "antd";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

import { dataSourceGroupList } from "../constants";
import DatabaseIcons from "../icon/DatabaseIcons";
import {
  createDataSource,
  testDataSourceConnectionWithParams,
  updateDataSource,
} from "../service";
import type {
  DataSourceFormValues,
  DataSourceModalOpenPayload,
  DataSourceModalRef,
  DataSourceRecord,
} from "../types";
import { DataSourceOperateType } from "../types";
import { buildSubmitPayload, parseOriginalJson } from "../utils";
import DataSourceTypeSelector from "./DataSourceTypeSelector";
import DynamicDataSourceForm from "./DynamicDataSourceForm";

const AddOrEditDataSourceModal = forwardRef<DataSourceModalRef>((_, ref) => {
  const intl = useIntl();
  const [basicForm] = Form.useForm<DataSourceFormValues>();
  const [configForm] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [operateType, setOperateType] = useState(DataSourceOperateType.Create);
  const [currentRecord, setCurrentRecord] = useState<DataSourceRecord>();
  const [selectedDbType, setSelectedDbType] = useState("");
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
    setSelectedDbType("");
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
      name: record.name || "",
      environment: record.environment || "",
      remark: record.remark || "",
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
        setSelectedDbType(nextRecord.dbType || "");
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

      setSelectedDbType("");
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
    setSelectedDbType("");
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
        message.success("连接测试成功");
      }
    } catch (error) {
      if (error && typeof error === "object" && "errorFields" in error) {
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
        connectionValues
      );

      const response = isCreateMode
        ? await createDataSource(payload)
        : currentRecord?.id
        ? await updateDataSource(currentRecord.id, payload)
        : undefined;
      if (!response || response.code !== API_SUCCESS_CODE) return;

      const successCallback = successCallbackRef.current;
      message.success(isCreateMode ? "数据源创建成功" : "数据源更新成功");
      setSubmitting(false);
      setOpen(false);
      resetModalState();
      successCallback?.();
    } catch (error) {
      if (error && typeof error === "object" && "errorFields" in error) {
        return;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const modalActionText = isEditMode
    ? intl.formatMessage({
        id: "pages.datasource.modal.title.edit",
        defaultMessage: "Edit",
      })
    : intl.formatMessage({
        id: "pages.datasource.modal.title.add",
        defaultMessage: "Add",
      });

  return (
    <Modal
      width="min(960px, calc(100vw - 32px))"
      open={open}
      centered
      maskClosable={false}
      closable={!busy}
      keyboard={!busy}
      onCancel={handleClose}
      destroyOnClose
      styles={{
        header: {
          padding: "16px 20px 12px",
          borderBottom: "1px solid #EEF0F3",
          marginBottom: 0,
        },
        body: {
          padding: "14px 20px 18px",
          background: "#FFFFFF",
          maxHeight: "calc(100vh - 190px)",
          overflowY: "auto",
        },
        footer: {
          padding: "11px 20px 14px",
          borderTop: "1px solid #EEF0F3",
          background: "#FFFFFF",
          marginTop: 0,
        },
        content: {
          padding: 0,
          borderRadius: 12,
          overflow: "hidden",
        },
      }}
      title={
        <div className="flex min-w-0 items-center gap-2.5 pr-6">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F2F4F7]">
            <DatabaseIcons dbType={selectedDbType} width="17" height="17" />
          </div>

          <div className="min-w-0">
            <div className="truncate text-base font-semibold leading-6 text-[#161823]">
              {modalActionText}
              {intl.formatMessage({
                id: "pages.datasource.common.title",
                defaultMessage: " Data Source",
              })}
            </div>

            <div className="truncate text-xs leading-5 text-[#8A8F99]">
              {selectedDbType
                ? `当前类型：${selectedDbType}`
                : "选择需要创建的数据源类型"}
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <div>
            {showFormStep && isCreateMode && !hideBackButton ? (
              <Button disabled={busy} onClick={handleBackToTypeSelection}>
                上一步
              </Button>
            ) : (
              <Button disabled={busy} onClick={handleClose}>
                取消
              </Button>
            )}
          </div>

          {showFormStep && (
            <div className="flex items-center gap-2">
              <Button
                loading={testing}
                disabled={submitting}
                onClick={() => void handleTestConnection()}
              >
                连接测试
              </Button>

              <Button
                type="primary"
                loading={submitting}
                disabled={testing}
                onClick={() => void handleSubmit()}
              >
                完成
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div style={{ height: "50vh" }}>
        {showFormStep ? (
          <DynamicDataSourceForm
            key={`${operateType}-${selectedDbType}-${
              currentRecord?.id || "create"
            }`}
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
          <DataSourceTypeSelector
            dataSourceGroups={dataSourceGroupList}
            onSelect={handleSelectDbType}
          />
        )}
      </div>
    </Modal>
  );
});

AddOrEditDataSourceModal.displayName = "AddOrEditDataSourceModal";

export default AddOrEditDataSourceModal;
