package io.yak.ops.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import javax.annotation.Resource;
import lombok.NonNull;
import io.yak.ops.domain.enums.ScheduleStatusEnum;
import io.yak.ops.dao.entity.JobSchedule;
import io.yak.ops.dao.mapper.JobScheduleMapper;
import io.yak.ops.dao.repository.BaseDao;
import io.yak.ops.dao.repository.JobScheduleDao;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public class JobScheduleDaoImpl
        extends BaseDao<JobSchedule, JobScheduleMapper>
        implements JobScheduleDao {

    @Resource
    private JobScheduleMapper jobScheduleMapper;

    public JobScheduleDaoImpl(@NonNull JobScheduleMapper jobScheduleMapper) {
        super(jobScheduleMapper);
    }

    @Override
    public JobSchedule queryByJobDefinitionId(Long jobDefinitionId) {
        LambdaQueryWrapper<JobSchedule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(JobSchedule::getJobDefinitionId, jobDefinitionId)
                .last("LIMIT 1");
        return jobScheduleMapper.selectOne(wrapper);
    }

    @Override
    public boolean existsByJobDefinitionId(Long jobDefinitionId) {
        LambdaQueryWrapper<JobSchedule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(JobSchedule::getJobDefinitionId, jobDefinitionId);
        return jobScheduleMapper.selectCount(wrapper) > 0;
    }

    @Override
    public boolean deleteByJobDefinitionId(Long jobDefinitionId) {
        LambdaQueryWrapper<JobSchedule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(JobSchedule::getJobDefinitionId, jobDefinitionId);
        return jobScheduleMapper.delete(wrapper) > 0;
    }

    @Override
    public List<JobSchedule> queryByScheduleStatus(ScheduleStatusEnum scheduleStatus) {
        LambdaQueryWrapper<JobSchedule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(JobSchedule::getScheduleStatus, scheduleStatus)
                .orderByDesc(JobSchedule::getUpdateTime);
        return jobScheduleMapper.selectList(wrapper);
    }

    @Override
    public boolean updateScheduleStatus(Long scheduleId, ScheduleStatusEnum scheduleStatus) {
        LambdaUpdateWrapper<JobSchedule> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(JobSchedule::getId, scheduleId)
                .set(JobSchedule::getScheduleStatus, scheduleStatus);
        return jobScheduleMapper.update(null, wrapper) > 0;
    }

    @Override
    public boolean updateLastScheduleTime(Long scheduleId, Date lastScheduleTime) {
        LambdaUpdateWrapper<JobSchedule> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(JobSchedule::getId, scheduleId)
                .set(JobSchedule::getLastScheduleTime, lastScheduleTime);
        return jobScheduleMapper.update(null, wrapper) > 0;
    }

    @Override
    public boolean updateNextScheduleTime(Long scheduleId, Date nextScheduleTime) {
        LambdaUpdateWrapper<JobSchedule> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(JobSchedule::getId, scheduleId)
                .set(JobSchedule::getNextScheduleTime, nextScheduleTime);
        return jobScheduleMapper.update(null, wrapper) > 0;
    }
}
