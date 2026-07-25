package io.yak.ops.engine.legacy.internal.vendor;

import io.yak.ops.engine.legacy.LegacyRestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 在适配器边界将旧版 REST 客户端的无类型数据转换为内部响应对象。
 */
final class RestTemplateLinkUpEngineClient
        implements LinkUpEngineClient {

    private final LegacyRestClient client;

    RestTemplateLinkUpEngineClient(
            LegacyRestClient client) {
        this.client = client;
    }

    @Override
    public LinkUpSubmitResponse submit(
            long id,
            byte[] config,
            String filename) {

        Map<?, ?> value =
                client.submitJobUpload(
                        id,
                        config,
                        filename);

        return value == null
                ? null
                : new LinkUpSubmitResponse(
                string(value.get("jobId")));
    }

    @Override
    public LinkUpJobResponse job(
            long id,
            String jobId) {

        Map<?, ?> value =
                client.jobInfo(id, jobId);

        return value == null
                ? null
                : new LinkUpJobResponse(
                string(value.get("status")),
                string(value.get("errorMessage")),
                maps(value.get("pipelines")),
                maps(value.get("tasks")));
    }

    @Override
    public LinkUpMetricsResponse metrics(
            long id,
            String jobId) {

        return new LinkUpMetricsResponse(
                client.jobInfo(id, jobId));
    }

    @Override
    public void cancel(
            long id,
            String jobId) {

        client.stopJob(id, jobId, false);
    }

    @Override
    public void probe(long id) {
        client.runningJobs(id);
    }

    private static String string(Object value) {
        return value == null
                ? null
                : value.toString();
    }

    /**
     * 将无类型列表中的 Map 元素安全转换为 Map 列表。
     */
    private static List<Map<?, ?>> maps(Object value) {
        if (!(value instanceof List<?>)) {
            return Collections.emptyList();
        }

        List<Map<?, ?>> result = new ArrayList<>();

        for (Object item : (List<?>) value) {
            if (item instanceof Map<?, ?>) {
                result.add((Map<?, ?>) item);
            }
        }

        return result;
    }
}