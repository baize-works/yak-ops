package io.baize.flow.dao.repository;

import io.baize.flow.domain.enums.ScheduleStatusEnum;
import io.baize.flow.dao.entity.JobSchedule;

import java.util.Date;
import java.util.List;

public interface JobScheduleDao extends IDao<JobSchedule> {

    JobSchedule queryByJobDefinitionId(Long jobDefinitionId);

    boolean existsByJobDefinitionId(Long jobDefinitionId);

    boolean deleteByJobDefinitionId(Long jobDefinitionId);

    List<JobSchedule> queryByScheduleStatus(ScheduleStatusEnum scheduleStatus);

    boolean updateScheduleStatus(Long scheduleId, ScheduleStatusEnum scheduleStatus);

    boolean updateLastScheduleTime(Long scheduleId, Date lastScheduleTime);

    boolean updateNextScheduleTime(Long scheduleId, Date nextScheduleTime);
}
