package io.yak.ops.application.service;

import io.yak.ops.domain.enums.ScheduleStatusEnum;
import io.yak.ops.dao.entity.JobSchedule;
import io.yak.ops.application.model.dto.LinkUpJobScheduleDTO;

import java.util.Date;
import java.util.List;

public interface JobScheduleService {

    Long createTaskSchedule(LinkUpJobScheduleDTO dto);

    boolean updateTaskSchedule(LinkUpJobScheduleDTO dto);

    boolean deleteByTaskDefinitionId(Long taskDefinitionId);

    JobSchedule getByTaskDefinitionId(Long taskDefinitionId);

    Boolean startSchedule(Long taskScheduleId);

    Boolean stopSchedule(Long taskScheduleId);

    boolean triggerSchedule(Long taskScheduleId);

    boolean updateScheduleTime(Long taskScheduleId, String cronExpression);

    List<JobSchedule> getRunningSchedules();

    boolean existsByTaskDefinitionId(Long taskDefinitionId);

    boolean updateScheduleStatus(Long taskScheduleId, ScheduleStatusEnum status);

    boolean updateLastScheduleTime(Long taskScheduleId);

    boolean updateNextScheduleTime(Long taskScheduleId, Date nextScheduleTime);

    List<String> getLast5ExecutionTimesByCron(String cronExpression);

    void removeByDefinitionId(Long definitionId);
}
