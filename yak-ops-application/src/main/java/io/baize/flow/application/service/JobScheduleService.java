package io.baize.flow.application.service;

import io.baize.flow.domain.enums.ScheduleStatusEnum;
import io.baize.flow.dao.entity.JobSchedule;
import io.baize.flow.web.contract.dto.SeaTunnelJobScheduleDTO;

import java.util.Date;
import java.util.List;

public interface JobScheduleService {

    Long createTaskSchedule(SeaTunnelJobScheduleDTO dto);

    boolean updateTaskSchedule(SeaTunnelJobScheduleDTO dto);

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
