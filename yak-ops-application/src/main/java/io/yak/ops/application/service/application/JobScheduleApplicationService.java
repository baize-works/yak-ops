package io.yak.ops.application.service.application;

import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.application.service.JobScheduleService;
import io.yak.ops.domain.enums.ScheduleStatusEnum;
import io.yak.ops.dao.entity.JobSchedule;
import io.yak.ops.application.model.dto.LinkUpJobScheduleDTO;
import io.yak.ops.application.model.dto.command.BatchJobSaveCommand;
import io.yak.ops.application.model.dto.command.JobDefinitionSaveCommand;
import io.yak.ops.application.model.dto.config.JobScheduleConfig;
import org.springframework.stereotype.Service;

@Service
public class JobScheduleApplicationService {

    @Resource
    private JobScheduleService jobScheduleService;

    public void saveOrUpdateSchedule(Long jobDefinitionId, BatchJobSaveCommand command) {
        if (jobDefinitionId == null || command == null) {
            return;
        }

        JobScheduleConfig scheduleConfig = command.getSchedule();
        if (shouldRemoveSchedule(scheduleConfig)) {
            removeSchedule(jobDefinitionId);
            return;
        }

        ScheduleStatusEnum scheduleStatus = scheduleConfig.resolveScheduleStatus();
        if (scheduleStatus == null) {
            throw new RuntimeException("Invalid scheduleRunType: " + scheduleConfig.getScheduleRunType());
        }

        JobSchedule existing = jobScheduleService.getByTaskDefinitionId(jobDefinitionId);

        LinkUpJobScheduleDTO scheduleDTO = buildScheduleDTO(
                jobDefinitionId,
                scheduleConfig,
                scheduleStatus,
                existing
        );

        Long scheduleId = saveSchedule(scheduleDTO, existing);

        // 先停再启，避免技术调度器中残留旧 trigger
        refreshQuartzState(scheduleId, scheduleStatus);

        // 再把最终业务状态回写成前端目标状态，避免被 startSchedule/stopSchedule 中间覆盖
        boolean updated = jobScheduleService.updateScheduleStatus(scheduleId, scheduleStatus);
        if (!updated) {
            throw new RuntimeException("Failed to update final schedule status");
        }
    }

    public void removeSchedule(Long jobDefinitionId) {
        jobScheduleService.removeByDefinitionId(jobDefinitionId);
    }

    public JobSchedule getByTaskDefinitionId(Long jobDefinitionId) {
        return jobScheduleService.getByTaskDefinitionId(jobDefinitionId);
    }

    private boolean shouldRemoveSchedule(JobScheduleConfig scheduleConfig) {
        return scheduleConfig == null || StringUtils.isBlank(scheduleConfig.getCronExpression());
    }

    private LinkUpJobScheduleDTO buildScheduleDTO(Long jobDefinitionId,
                                                     JobScheduleConfig scheduleConfig,
                                                     ScheduleStatusEnum scheduleStatus,
                                                     JobSchedule existing) {
        LinkUpJobScheduleDTO dto = new LinkUpJobScheduleDTO();
        dto.setJobDefinitionId(jobDefinitionId);
        dto.setCronExpression(scheduleConfig.getCronExpression() == null
                ? null
                : scheduleConfig.getCronExpression().trim());
        dto.setScheduleStatus(scheduleStatus);
        dto.setScheduleConfig(scheduleConfig);

        if (existing != null) {
            dto.setId(existing.getId());
        }
        return dto;
    }

    private Long saveSchedule(LinkUpJobScheduleDTO scheduleDTO, JobSchedule existing) {
        if (existing == null) {
            return jobScheduleService.createTaskSchedule(scheduleDTO);
        }
        jobScheduleService.updateTaskSchedule(scheduleDTO);
        return existing.getId();
    }

    private void refreshQuartzState(Long scheduleId, ScheduleStatusEnum scheduleStatus) {
        // 先停再启，避免 Quartz 中残留旧 trigger
        jobScheduleService.stopSchedule(scheduleId);

        if (scheduleStatus.shouldStartQuartz()) {
            jobScheduleService.startSchedule(scheduleId);
        }
    }
}
