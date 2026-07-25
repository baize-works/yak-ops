package io.yak.ops.infrastructure.scheduler;

import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.infrastructure.scheduler.QuartzJob;
import io.yak.ops.application.service.JobScheduleService;
import io.yak.ops.domain.enums.ScheduleStatusEnum;
import io.yak.ops.common.utils.ConvertUtil;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.infrastructure.quartz.QuartzScheduleUtils;
import io.yak.ops.dao.entity.JobSchedule;
import io.yak.ops.dao.repository.JobScheduleDao;
import io.yak.ops.application.model.dto.LinkUpJobScheduleDTO;
import io.yak.ops.application.model.dto.config.JobScheduleConfig;
import org.quartz.*;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Slf4j
@Service
public class JobScheduleServiceAdapter implements JobScheduleService {

    @Resource
    private JobScheduleDao jobScheduleDao;

    private final Scheduler scheduler;

    public JobScheduleServiceAdapter(Scheduler scheduler) {
        this.scheduler = scheduler;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long createTaskSchedule(LinkUpJobScheduleDTO dto) {
        log.info("Creating job schedule: {}", dto);

        if (dto == null || dto.getJobDefinitionId() == null) {
            throw new RuntimeException("Job definition id cannot be null");
        }

        if (StringUtils.isBlank(dto.getCronExpression())) {
            throw new RuntimeException("Cron expression cannot be empty");
        }

        if (jobScheduleDao.existsByJobDefinitionId(dto.getJobDefinitionId())) {
            throw new RuntimeException("Schedule configuration already exists for this job definition");
        }

        JobSchedule po = ConvertUtil.sourceToTarget(dto, JobSchedule.class);
        po.setCronExpression(dto.getCronExpression().trim());
        po.setScheduleConfig(buildPersistedScheduleConfigJson(dto.getScheduleConfig()));
        po.initInsert();

        int saveResult = jobScheduleDao.insert(po);
        if (saveResult <= 0) {
            throw new RuntimeException("Failed to create task schedule");
        }

        log.info("Task schedule created successfully, ID: {}", po.getId());
        return po.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateTaskSchedule(LinkUpJobScheduleDTO dto) {
        log.info("Updating task schedule: {}", dto);

        if (dto == null || dto.getId() == null) {
            throw new RuntimeException("Schedule id cannot be null");
        }

        if (StringUtils.isBlank(dto.getCronExpression())) {
            throw new RuntimeException("Cron expression cannot be empty");
        }

        JobSchedule existingSchedule = jobScheduleDao.queryById(dto.getId());
        if (existingSchedule == null) {
            throw new RuntimeException("Task schedule configuration does not exist");
        }

        JobSchedule schedule = new JobSchedule();
        BeanUtils.copyProperties(dto, schedule);
        schedule.setCronExpression(dto.getCronExpression().trim());
        schedule.setScheduleConfig(buildPersistedScheduleConfigJson(dto.getScheduleConfig()));

        boolean updateResult = jobScheduleDao.updateById(schedule);
        if (!updateResult) {
            throw new RuntimeException("Failed to update task schedule configuration");
        }

        log.info("Task schedule updated successfully, ID: {}", dto.getId());
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteByTaskDefinitionId(Long taskDefinitionId) {
        log.info("Deleting schedule by task definition ID: {}", taskDefinitionId);

        if (taskDefinitionId == null) {
            return true;
        }

        JobSchedule taskSchedule = jobScheduleDao.queryByJobDefinitionId(taskDefinitionId);
        if (taskSchedule == null) {
            log.warn("Schedule configuration not found for task definition ID: {}", taskDefinitionId);
            return true;
        }

        stopSchedule(taskSchedule.getId());

        boolean removeResult = jobScheduleDao.deleteByJobDefinitionId(taskDefinitionId);
        log.info("Schedule deletion by task definition ID completed: {}, Result: {}", taskDefinitionId, removeResult);
        return removeResult;
    }

    @Override
    public JobSchedule getByTaskDefinitionId(Long taskDefinitionId) {
        return jobScheduleDao.queryByJobDefinitionId(taskDefinitionId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean startSchedule(Long taskScheduleId) {
        log.info("Starting task schedule: {}", taskScheduleId);

        JobSchedule jobSchedule = jobScheduleDao.queryById(taskScheduleId);
        if (jobSchedule == null) {
            throw new RuntimeException("Task schedule configuration does not exist");
        }

        try {
            JobKey jobKey = buildJobKey(taskScheduleId);
            TriggerKey triggerKey = buildTriggerKey(taskScheduleId);

            if (scheduler.checkExists(jobKey)) {
                scheduler.deleteJob(jobKey);
                log.info("Deleted existing Quartz job before restart: {}", taskScheduleId);
            }

            JobDetail jobDetail = createJobDetail(jobSchedule);
            Trigger trigger = createTrigger(jobSchedule, triggerKey);

            scheduler.scheduleJob(jobDetail, trigger);
        } catch (SchedulerException e) {
            log.error("Failed to start schedule, scheduleId={}", taskScheduleId, e);
            throw new RuntimeException("Failed to start schedule", e);
        }

        Date nextExecutionTime = QuartzScheduleUtils.getNextExecutionTime(jobSchedule.getCronExpression());
        jobScheduleDao.updateNextScheduleTime(taskScheduleId, nextExecutionTime);

        jobScheduleDao.updateScheduleStatus(taskScheduleId, ScheduleStatusEnum.NORMAL);

        log.info("Task schedule started successfully: {}", taskScheduleId);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean stopSchedule(Long taskScheduleId) {
        log.info("Stopping task schedule: {}", taskScheduleId);

        JobSchedule taskSchedule = jobScheduleDao.queryById(taskScheduleId);
        if (taskSchedule == null) {
            return true;
        }

        JobKey jobKey = buildJobKey(taskScheduleId);
        try {
            if (scheduler.checkExists(jobKey)) {
                scheduler.deleteJob(jobKey);
            }
        } catch (SchedulerException e) {
            log.error("Failed to stop schedule, scheduleId={}", taskScheduleId, e);
            throw new RuntimeException("Failed to stop schedule", e);
        }

        jobScheduleDao.updateScheduleStatus(taskScheduleId, ScheduleStatusEnum.PAUSE);
        jobScheduleDao.updateNextScheduleTime(taskScheduleId, null);

        log.info("Task schedule stopped successfully: {}", taskScheduleId);
        return true;
    }

    @Override
    public boolean triggerSchedule(Long taskScheduleId) {
        log.info("Triggering task schedule immediately: {}", taskScheduleId);

        JobSchedule taskSchedule = jobScheduleDao.queryById(taskScheduleId);
        if (taskSchedule == null) {
            throw new RuntimeException("Task schedule configuration does not exist");
        }

        JobKey jobKey = buildJobKey(taskScheduleId);
        try {
            if (!scheduler.checkExists(jobKey)) {
                throw new RuntimeException("Schedule has not been started yet");
            }

            scheduler.triggerJob(jobKey);
        } catch (SchedulerException e) {
            log.error("Failed to trigger schedule, scheduleId={}", taskScheduleId, e);
            throw new IllegalStateException(
                    "Failed to trigger schedule, scheduleId=" + taskScheduleId, e);
        }

        log.info("Task schedule triggered successfully: {}", taskScheduleId);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateScheduleTime(Long taskScheduleId, String cronExpression) {
        log.info("Updating schedule time: {}, Cron: {}", taskScheduleId, cronExpression);

        if (StringUtils.isBlank(cronExpression)) {
            throw new RuntimeException("Cron expression cannot be empty");
        }

        JobSchedule taskSchedule = jobScheduleDao.queryById(taskScheduleId);
        if (taskSchedule == null) {
            throw new RuntimeException("Task schedule configuration does not exist");
        }

        ScheduleStatusEnum originalStatus = taskSchedule.getScheduleStatus();
        taskSchedule.setCronExpression(cronExpression.trim());

        boolean updateResult = jobScheduleDao.updateById(taskSchedule);
        if (!updateResult) {
            throw new RuntimeException("Failed to update schedule time");
        }

        if (originalStatus != null && originalStatus.shouldStartQuartz()) {
            stopSchedule(taskScheduleId);
            startSchedule(taskScheduleId);

            if (originalStatus != ScheduleStatusEnum.NORMAL) {
                jobScheduleDao.updateScheduleStatus(taskScheduleId, originalStatus);
            }
        } else {
            jobScheduleDao.updateNextScheduleTime(taskScheduleId, null);
        }

        log.info("Schedule time updated successfully: {}", taskScheduleId);
        return true;
    }

    @Override
    public List<JobSchedule> getRunningSchedules() {
        List<JobSchedule> result = new ArrayList<>();
        result.addAll(jobScheduleDao.queryByScheduleStatus(ScheduleStatusEnum.NORMAL));
        result.addAll(jobScheduleDao.queryByScheduleStatus(ScheduleStatusEnum.EMPTY));
        return result;
    }

    @Override
    public boolean existsByTaskDefinitionId(Long taskDefinitionId) {
        return jobScheduleDao.existsByJobDefinitionId(taskDefinitionId);
    }

    @Override
    public boolean updateScheduleStatus(Long taskScheduleId, ScheduleStatusEnum status) {
        return jobScheduleDao.updateScheduleStatus(taskScheduleId, status);
    }

    @Override
    public boolean updateLastScheduleTime(Long taskScheduleId) {
        return jobScheduleDao.updateLastScheduleTime(taskScheduleId, new Date());
    }

    @Override
    public boolean updateNextScheduleTime(Long taskScheduleId, Date nextScheduleTime) {
        return jobScheduleDao.updateNextScheduleTime(taskScheduleId, nextScheduleTime);
    }

    @Override
    public List<String> getLast5ExecutionTimesByCron(String cronExpression) {
        if (StringUtils.isBlank(cronExpression)) {
            throw new RuntimeException("Cron expression cannot be empty");
        }

        String cleanedCron = cronExpression.trim().replaceAll("\\s+", " ");
        if (!isValidCronExpression(cleanedCron)) {
            throw new RuntimeException("Invalid cron expression format: " + cleanedCron);
        }

        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        CronExpression expression;
        try {
            expression = new CronExpression(cleanedCron);
        } catch (ParseException e) {
            throw new RuntimeException("Failed to parse cron expression: " + cleanedCron, e);
        }

        Date now = new Date();
        List<String> executionTimes = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            now = expression.getNextValidTimeAfter(now);
            if (now == null) {
                break;
            }
            executionTimes.add(dateFormat.format(now));
        }
        return executionTimes;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void removeByDefinitionId(Long definitionId) {
        if (definitionId == null) {
            return;
        }

        JobSchedule schedule = jobScheduleDao.queryByJobDefinitionId(definitionId);
        if (schedule == null) {
            return;
        }

        try {
            stopSchedule(schedule.getId());
            jobScheduleDao.deleteById(schedule.getId());
        } catch (Exception e) {
            throw new RuntimeException("Failed to remove schedule", e);
        }
    }

    private String buildPersistedScheduleConfigJson(JobScheduleConfig source) {
        if (source == null) {
            return null;
        }

        JobScheduleConfig persisted = new JobScheduleConfig();
        persisted.setParamsList(source.getParamsList());
        persisted.setInstanceGenerateMode(source.getInstanceGenerateMode());

        persisted.setTimeoutMode(source.getTimeoutMode());
        persisted.setTimeoutValue(source.getTimeoutValue());
        persisted.setTimeoutUnit(source.getTimeoutUnit());

        persisted.setRerunPolicy(source.getRerunPolicy());
        persisted.setAutoRetry(source.getAutoRetry());
        persisted.setRetryTimes(source.getRetryTimes());
        persisted.setRetryInterval(source.getRetryInterval());

        persisted.setScheduleType(source.getScheduleType());
        persisted.setHourMode(source.getHourMode());

        persisted.setHourlyRangeValue(source.getHourlyRangeValue());
        persisted.setHourlyAppointValue(source.getHourlyAppointValue());
        persisted.setDailyValue(source.getDailyValue());
        persisted.setWeeklyValue(source.getWeeklyValue());

        persisted.setEffectType(source.getEffectType());

        persisted.setCronExpression(null);
        persisted.setScheduleRunType(null);

        return JSONUtils.toJsonString(persisted);
    }

    private boolean isValidCronExpression(String cronExpression) {
        String[] parts = cronExpression.split(" ");
        return parts.length == 6 || parts.length == 7;
    }

    private JobKey buildJobKey(Long taskScheduleId) {
        return JobKey.jobKey(String.valueOf(taskScheduleId));
    }

    private TriggerKey buildTriggerKey(Long taskScheduleId) {
        return TriggerKey.triggerKey(String.valueOf(taskScheduleId));
    }

    private JobDetail createJobDetail(JobSchedule taskSchedule) {
        return JobBuilder.newJob(QuartzJob.class)
                .withIdentity(buildJobKey(taskSchedule.getId()))
                .usingJobData("jobScheduleId", taskSchedule.getId())
                .usingJobData("jobDefinitionId", taskSchedule.getJobDefinitionId())
                .build();
    }

    private Trigger createTrigger(JobSchedule taskSchedule, TriggerKey triggerKey) {
        return TriggerBuilder.newTrigger()
                .withIdentity(triggerKey)
                .forJob(buildJobKey(taskSchedule.getId()))
                .withSchedule(CronScheduleBuilder.cronSchedule(taskSchedule.getCronExpression()))
                .build();
    }
}
