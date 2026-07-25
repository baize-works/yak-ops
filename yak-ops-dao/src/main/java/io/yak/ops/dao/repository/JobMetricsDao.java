package io.yak.ops.dao.repository;

import org.apache.ibatis.annotations.Param;
import io.yak.ops.dao.entity.JobMetrics;

import java.util.List;
import java.util.Map;

public interface JobMetricsDao extends IDao<JobMetrics> {


    Map<String, Object> selectOverviewSummary(String startTime, String endTime, String taskType);

    List<Map<String, Object>> selectRecordsTrend( String startTime,
                                                  String endTime,
                                                  String taskType,
                                                  String granularity);

    List<Map<String, Object>> selectBytesTrend( String startTime,
                                                String endTime,
                                                String taskType,
                                                String granularity);

    List<Map<String, Object>> selectRecordsSpeedTrend( String startTime,
                                                       String endTime,
                                                       String taskType,
                                                       String granularity);

    List<Map<String, Object>> selectBytesSpeedTrend( String startTime,
                                                     String endTime,
                                                     String taskType,
                                                     String granularity);

    void deleteByDefinitionId(Long definitionId);
}
