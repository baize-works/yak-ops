import {linkupJobDefinitionApi} from "@/pages/batch-link-up/api";
import CloseIcon from "@/pages/batch-link-up/workflow/icon/CloseIcon";
import CodeBlockWithCopy from "@/pages/batch-link-up/workflow/operator/CodeBlockWithCopy";
import {FileTextOutlined, SaveOutlined} from "@ant-design/icons";
import {Button, Divider, message, Popover, Tooltip} from "antd";
import React from "react";

interface Props {
  form: any;
  baseForm: any;
  goBack: () => void;
  idFromUrl: string | null;
  sourceType: any;
  targetType: any;
  matchMode: string;
  multiTableList: string[];
  buildTaskDraft: () => any;
}

const MultiSyncActions: React.FC<Props> = ({
                                             form,
                                             baseForm,
                                             goBack,
                                             idFromUrl,
                                             sourceType,
                                             targetType,
                                             matchMode,
                                             multiTableList,
                                             buildTaskDraft,
                                           }) => {
  const [open, setOpen] = React.useState(false);
  const [content, setContent] = React.useState<any>("");

  const validateBeforeSubmit = async () => {
    await form.validateFields();

    if (matchMode === "1" && (!multiTableList || multiTableList.length === 0)) {
      message.warning("table_list 不能为空");
      return false;
    }

    const sourceId = form?.getFieldValue("sourceId");
    const sinkId = form?.getFieldValue("sinkId");
    if (sourceId === sinkId) {
      message.warning("来源和去向的数据源不能相同！");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    try {
      const pass = await validateBeforeSubmit();
      if (!pass) return;

      const draft = buildTaskDraft();
      const leftSideParam = baseForm?.getFieldsValue();
      const isEdit = !!baseForm?.getFieldValue("id");
      console.log(leftSideParam);

      const params = {
        jobDefinitionInfo: JSON.stringify(draft),
        ...leftSideParam,
        sourceType: sourceType?.dbType,
        sinkType: targetType?.dbType,
        id: idFromUrl,
        jobType: "BATCH",
      };

      const res = await linkupJobDefinitionApi.saveOrUpdateGuideMulti(
        params
      );

      goBack();
      message.success(isEdit ? "更新成功" : "发布成功");
    } catch (e) {
      console.error(e);
    }
  };

  const handlePreviewHocon = async () => {
    try {
      const pass = await validateBeforeSubmit();
      if (!pass) return;

      const draft = buildTaskDraft();
      const leftSideParam = baseForm?.getFieldsValue();
      const params = {
        jobDefinitionInfo: JSON.stringify(draft),
        ...leftSideParam,
        jobType: "BATCH",
      };

      const res = await linkupJobDefinitionApi.hocon(params);

      setOpen(true);
      setContent(res?.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      style={{
        width: "calc(100vw - 224px)",
        padding: "16px 24px",
        background: "white",
        position: "fixed",
        border: "1px solid rgba(227,228,230,1)",
        bottom: 0,
      }}
    >
      <div style={{display: "flex", justifyContent: "space-between"}}>
        <div>
          <Button
            size="small"
            style={{width: 70}}
            type="primary"
            icon={<SaveOutlined/>}
            onClick={handleSave}
          >
            Save
          </Button>

          <Divider type="vertical"/>

          <Popover
            open={open}
            content={
              <div className="publish-popover" style={{width: 600}}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div className="latest-publish" style={{fontWeight: 500}}>
                    Linkup Hocon
                  </div>
                  <div
                    onClick={() => setOpen(false)}
                    style={{cursor: "pointer"}}
                  >
                    <CloseIcon/>
                  </div>
                </div>
                <Tooltip title="hocon模拟生成">
                  <CodeBlockWithCopy content={content}/>
                </Tooltip>
              </div>
            }
          >
            <Button
              style={{width: 75}}
              size="small"
              type="primary"
              icon={<FileTextOutlined/>}
              onClick={handlePreviewHocon}
            >
              Hocon
            </Button>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default MultiSyncActions;
