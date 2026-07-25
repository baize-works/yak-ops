import { message } from "antd";
import { useState } from "react";
import { history } from "umi";
import { linkupJobDefinitionApi } from "./api";
import DataSyncHeader from "./components/DataSyncHeader";
import SyncTaskList from "./components/SyncTaskList";
// import SyncTaskList from "./SyncTaskList";

const App = () => {
  const [sourceType, setSourceType] = useState<any>({
    dbType: "MYSQL",
    connectorType: "Jdbc",
    pluginName: "JDBC-MYSQL",
  });

  const [targetType, setTargetType] = useState<any>({
    dbType: "MYSQL",
    connectorType: "Jdbc",
    pluginName: "JDBC-MYSQL",
  });

  /**
   * 新增场景：
   * 先申请唯一ID，继续沿用缓存方式进入详情页
   */
  const goDetail = () => {
    linkupJobDefinitionApi.getUniqueId().then((data) => {
      if (data?.code === 0) {
        const returnId = data?.data;

        sessionStorage.setItem(
          `batch-link-up-detail-${returnId}`,
          JSON.stringify({
            sourceType,
            targetType,
            id: returnId,
          })
        );

        history.push(`/sync/batch-link-up/${returnId}/detail`);
      } else {
        
      }
    });
  };

  /**
   * 编辑场景：
   * 不再进入 DetailPage，而是先查编辑详情，根据 mode 直接跳转到对应配置页
   */
  const goEdit = async (id: string, item: any) => {
    if (!id) {
      message.warning("任务定义ID不能为空");
      return;
    }

    console.log(item);

    try {
      const mode = item?.mode;

      if (mode === "GUIDE_SINGLE") {
        history.push(`/sync/batch-link-up/${id}/config/single?scene=edit`);
        return;
      }

      if (mode === "GUIDE_MULTI") {
        history.push(`/sync/batch-link-up/${id}/config/multi?scene=edit`);
        return;
      }

      if (mode === "SCRIPT") {
        history.push(`/sync/batch-link-up/${id}/config/script?scene=edit`);
        return;
      }

      
    } catch (error) {
      
    }
  };

  return (
    <div>
      <DataSyncHeader
        goDetail={goDetail}
        sourceType={sourceType}
        setSourceType={setSourceType}
        targetType={targetType}
        setTargetType={setTargetType}
      />

      <div>
        <SyncTaskList goDetail={goEdit} />
      </div>
    </div>
  );
};

export default App;
