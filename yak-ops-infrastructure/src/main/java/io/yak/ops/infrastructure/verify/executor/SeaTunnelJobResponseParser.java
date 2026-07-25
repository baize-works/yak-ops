package io.yak.ops.infrastructure.verify.executor;

import io.yak.ops.domain.enums.JobStatus;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Parse weakly typed SeaTunnel REST responses.
 */
@Component
@SuppressWarnings("rawtypes")
public class SeaTunnelJobResponseParser {

    public String extractJobId(Map submitResponse) {
        if (submitResponse == null || submitResponse.isEmpty()) {
            return null;
        }

        Object direct = firstNonNull(
                submitResponse.get("jobId")
        );
        String parsedDirect = direct.toString();
        if (parsedDirect != null) {
            return parsedDirect;
        }

        Object data = submitResponse.get("data");
        if (data instanceof Map) {
            Map dataMap = (Map) data;
            Object nested = firstNonNull(
                    dataMap.get("jobId")
            );
            return nested.toString();
        }

        return null;
    }

    public JobStatus extractStatus(Map info) {
        if (info == null || info.isEmpty()) {
            return null;
        }

        Object direct = firstNonNull(
                info.get("jobStatus")
        );
        JobStatus directStatus = toJobStatus(direct);
        if (directStatus != null) {
            return directStatus;
        }

        Object data = info.get("data");
        if (data instanceof Map) {
            Map dataMap = (Map) data;
            Object nested = firstNonNull(
                    dataMap.get("jobStatus")
            );
            return toJobStatus(nested);
        }

        return null;
    }

    public boolean containsJob(List list, String jobId) {
        if (list == null || list.isEmpty() || jobId == null) {
            return false;
        }

        for (Object item : list) {
            if (item instanceof Map) {
                Map map = (Map) item;
                Long id = toLong(firstNonNull(
                        map.get("jobId")
                ));
                if (jobId.equals(id.toString())) {
                    return true;
                }
            }
        }
        return false;
    }

    public JobStatus toJobStatus(Object value) {
        if (value == null) {
            return null;
        }

        try {
            return JobStatus.fromString(String.valueOf(value));
        } catch (Exception ignored) {
            return null;
        }
    }

    public Long toLong(Object value) {
        if (value == null) {
            return null;
        }

        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception ignored) {
            return null;
        }
    }

    private Object firstNonNull(Object... values) {
        if (values == null) {
            return null;
        }

        for (Object value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }
}
