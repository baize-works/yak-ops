package io.yak.ops.engine.legacy.internal.vendor;

import java.util.List;
import java.util.Map;

/** SeaTunnel wire DTOs; they must not escape this adapter package. */
final class SeaTunnelSubmitResponse {

    private final String jobId;

    public SeaTunnelSubmitResponse(String jobId) {
        this.jobId = jobId;
    }

    public String jobId() { return jobId; }


    public String getJobId() { return jobId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SeaTunnelSubmitResponse that = (SeaTunnelSubmitResponse) o;
        return java.util.Objects.equals(jobId, that.jobId);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(jobId); }

    @Override
    public String toString() {
        return "SeaTunnelSubmitResponse[" + "jobId=" + jobId + "]";
    }
}
final class SeaTunnelJobResponse {


    private final String status;

    private final String errorMessage;

    private final List<Map<?, ?>> pipelines;

    private final List<Map<?, ?>> tasks;


    public SeaTunnelJobResponse(String status, String errorMessage, List<Map<?, ?>> pipelines, List<Map<?, ?>> tasks) {

        this.status = status;

        this.errorMessage = errorMessage;

        this.pipelines = pipelines;

        this.tasks = tasks;

    }


    public String status() { return status; }



    public String getStatus() { return status; }


    public String errorMessage() { return errorMessage; }



    public String getErrorMessage() { return errorMessage; }


    public List<Map<?, ?>> pipelines() { return pipelines; }



    public List<Map<?, ?>> getPipelines() { return pipelines; }


    public List<Map<?, ?>> tasks() { return tasks; }



    public List<Map<?, ?>> getTasks() { return tasks; }


    @Override

    public boolean equals(Object o) {

        if (this == o) return true;

        if (o == null || getClass() != o.getClass()) return false;

        SeaTunnelJobResponse that = (SeaTunnelJobResponse) o;

        return java.util.Objects.equals(status, that.status) && java.util.Objects.equals(errorMessage, that.errorMessage) && java.util.Objects.equals(pipelines, that.pipelines) && java.util.Objects.equals(tasks, that.tasks);

    }


    @Override

    public int hashCode() { return java.util.Objects.hash(status, errorMessage, pipelines, tasks); }


    @Override

    public String toString() {

        return "SeaTunnelJobResponse[" + "status=" + status + ", " + "errorMessage=" + errorMessage + ", " + "pipelines=" + pipelines + ", " + "tasks=" + tasks + "]";

    }

}
final class SeaTunnelMetricsResponse {


    private final Map<?, ?> values;


    public SeaTunnelMetricsResponse(Map<?, ?> values) {

        this.values = values;

    }


    public Map<?, ?> values() { return values; }



    public Map<?, ?> getValues() { return values; }


    @Override

    public boolean equals(Object o) {

        if (this == o) return true;

        if (o == null || getClass() != o.getClass()) return false;

        SeaTunnelMetricsResponse that = (SeaTunnelMetricsResponse) o;

        return java.util.Objects.equals(values, that.values);

    }


    @Override

    public int hashCode() { return java.util.Objects.hash(values); }


    @Override

    public String toString() {

        return "SeaTunnelMetricsResponse[" + "values=" + values + "]";

    }

}
