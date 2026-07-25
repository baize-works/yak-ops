package io.yak.ops.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import io.yak.ops.dao.entity.JobMetrics;

import java.util.List;
import java.util.Map;

@Mapper
public interface JobMetricsMapper extends BaseMapper<JobMetrics> {

    Map<String, Object> selectOverviewSummary(@Param("startTime") String startTime,
                                              @Param("endTime") String endTime,
                                              @Param("taskType") String taskType);

    List<Map<String, Object>> selectRecordsTrend(@Param("startTime") String startTime,
                                                 @Param("endTime") String endTime,
                                                 @Param("taskType") String taskType,
                                                 @Param("granularity") String granularity);

    List<Map<String, Object>> selectBytesTrend(@Param("startTime") String startTime,
                                               @Param("endTime") String endTime,
                                               @Param("taskType") String taskType,
                                               @Param("granularity") String granularity);

    List<Map<String, Object>> selectRecordsSpeedTrend(@Param("startTime") String startTime,
                                                      @Param("endTime") String endTime,
                                                      @Param("taskType") String taskType,
                                                      @Param("granularity") String granularity);

    List<Map<String, Object>> selectBytesSpeedTrend(@Param("startTime") String startTime,
                                                    @Param("endTime") String endTime,
                                                    @Param("taskType") String taskType,
                                                    @Param("granularity") String granularity);
}
