import { linkupJobDefinitionApi } from "@/pages/batch-link-up/api";
import { message } from "antd";
import { useReactFlow } from "reactflow";
import { useLocation } from "umi";
import { useFlowChecks } from "./useFlowChecks";


export function useFlowPublish(nodes: any[], edges: any[], baseForm: any) {
    const { getViewport } = useReactFlow();
    const { checkStat, checkGroups } = useFlowChecks(nodes);
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const idFromUrl = query.get("id");

    const prepareFlowData = () => ({
        nodes,
        edges,
        viewport: getViewport(),
    });


    const publish = async () => {
        if (checkStat.total) {
            message.warning("发布更新前确保所有问题均已解决");
            return;
        }
        const flowData = prepareFlowData();
        const leftSideParam = baseForm?.getFieldsValue();
        console.log(flowData);

        const httpParams = {
            jobDefinitionInfo: JSON.stringify(flowData),
            ...leftSideParam,
            jobType: "BATCH",
            id: idFromUrl
        };

        const data = await linkupJobDefinitionApi.saveOrUpdateGuideMulti( httpParams);
        if (data?.code === 0) {
            message.success("发布成功");
        }
        else {
            
        }
    };


    const generateHocon = async () => {
        const flowData = prepareFlowData();
        const leftSideParam = baseForm?.getFieldsValue();
        return linkupJobDefinitionApi.hocon({
            jobDefinitionInfo: JSON.stringify(flowData),
            ...leftSideParam,
            jobType: "BATCH"
        });
    };


    return { publish, generateHocon };
}