package io.yak.ops.infrastructure.alarm.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannel;
import org.apache.seatunnel.plugin.alarm.api.AlarmData;
import org.apache.seatunnel.plugin.alarm.api.AlarmInfo;
import org.apache.seatunnel.plugin.alarm.api.AlarmResult;
import org.apache.seatunnel.plugin.alarm.api.AlarmSeverity;
import io.yak.ops.infrastructure.alarm.event.JobStatusChangedEvent;
import io.yak.ops.infrastructure.alarm.plugin.AlarmPluginManager;
import io.yak.ops.infrastructure.alarm.repository.AlarmRuleTargetRepository;
import io.yak.ops.infrastructure.alarm.repository.AlarmTarget;
import io.yak.ops.infrastructure.alarm.repository.JobInstanceBasic;
import io.yak.ops.infrastructure.alarm.repository.JobInstanceLookup;
import io.yak.ops.dao.entity.AlarmRecordEntity;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * Core alarm dispatch engine (the "sender"), mirroring DolphinScheduler's
 * {@code AlertSender}: on a status-change event it matches rules, builds an
 * {@link AlarmInfo} (channel params + {@link AlarmData}) and delegates to the
 * resolved {@link AlarmChannel}, persisting the result of every attempt.
 *
 * <p>
 * Runs on a dedicated executor so a slow webhook can never block the job
 * status-write thread; any exception is swallowed so alarms never break the
 * job lifecycle.
 * </p>
 */
@Component
@Slf4j
public class AlarmRuleEngine {

    private final AlarmRuleTargetRepository ruleRepository;

    private final JobInstanceLookup jobInstanceLookup;

    private final ObjectMapper objectMapper;

    private final AlarmPluginManager alarmPluginManager;

    public AlarmRuleEngine(AlarmRuleTargetRepository ruleRepository,
                           JobInstanceLookup jobInstanceLookup,
                           ObjectMapper objectMapper,
                           AlarmPluginManager alarmPluginManager) {
        this.ruleRepository = ruleRepository;
        this.jobInstanceLookup = jobInstanceLookup;
        this.objectMapper = objectMapper;
        this.alarmPluginManager = alarmPluginManager;
    }

    @EventListener
    @Async("alarmExecutor")
    public void onJobStatusChanged(JobStatusChangedEvent event) {
        dispatch(event);
    }

    public void dispatch(JobStatusChangedEvent event) {
        try {
            if (event == null || event.getNewStatus() == null || event.getJobInstanceId() == null) {
                return;
            }

            // Always resolve the instance: we need the definition's release
            // state to enforce "alarms only for online tasks".
            JobInstanceBasic basic = jobInstanceLookup.lookup(event.getJobInstanceId());
            if (basic == null) {
                log.warn("Skip alarm: job instance not found, jobInstanceId={}",
                        event.getJobInstanceId());
                return;
            }
            if (basic.getReleaseState() == null || !basic.getReleaseState().isOnline()) {
                log.info("Skip alarm: task is not online, jobInstanceId={}, releaseState={}",
                        event.getJobInstanceId(), basic.getReleaseState());
                return;
            }

            Long jobDefinitionId = basic.getJobDefinitionId() != null
                    ? basic.getJobDefinitionId()
                    : event.getJobDefinitionId();

            String newStatus = event.getNewStatus().name();
            List<AlarmTarget> targets = ruleRepository.findMatchedTargets(jobDefinitionId, newStatus);
            if (targets == null || targets.isEmpty()) {
                return;
            }

            for (AlarmTarget target : targets) {
                dispatchTarget(event, basic, jobDefinitionId, target, newStatus);
            }
        } catch (Exception e) {
            log.warn("Alarm dispatch failed, jobInstanceId={}", event.getJobInstanceId(), e);
        }
    }

    private void dispatchTarget(JobStatusChangedEvent event,
                               JobInstanceBasic basic,
                               Long jobDefinitionId,
                               AlarmTarget target,
                               String newStatus) {
        if (target == null || target.getChannels() == null || target.getChannels().isEmpty()) {
            return;
        }
        AlarmSeverity severity = AlarmDataBuilder.parseSeverity(target.getSeverity());
        AlarmData alarmData = AlarmDataBuilder.build(event, basic, severity);

        for (AlarmTarget.AlarmTargetChannel ch : target.getChannels()) {
            deliverToChannel(event, basic, jobDefinitionId, target, ch, alarmData, newStatus);
        }
    }

    private void deliverToChannel(JobStatusChangedEvent event,
                                  JobInstanceBasic basic,
                                  Long jobDefinitionId,
                                  AlarmTarget target,
                                  AlarmTarget.AlarmTargetChannel ch,
                                  AlarmData alarmData,
                                  String newStatus) {
        AlarmChannel channel = alarmPluginManager.getChannel(ch.getChannelType());
        AlarmResult result;
        if (channel == null) {
            result = AlarmResult.fail("alarm channel type not registered: " + ch.getChannelType());
            log.warn("No alarm channel registered for type {}, jobId={}", ch.getChannelType(),
                    event.getJobInstanceId());
        } else {
            Map<String, String> params = AlarmConfigParser.parse(objectMapper, ch.getConfigJson());
            AlarmInfo info = AlarmInfo.builder()
                    .alarmParams(params)
                    .alarmData(alarmData)
                    .alarmChannelId(ch.getChannelId())
                    .build();
            result = channel.process(info);
        }

        try {
            AlarmRecordEntity record = AlarmRecordEntity.builder()
                    .ruleId(target.getRuleId())
                    .channelId(ch.getChannelId())
                    .channelType(ch.getChannelType())
                    .jobInstanceId(event.getJobInstanceId())
                    .jobDefinitionId(jobDefinitionId)
                    .jobName(basic != null ? basic.getJobName() : null)
                    .newStatus(newStatus)
                    .severity(alarmData.getSeverity() == null ? null : alarmData.getSeverity().name())
                    .success(result.isSuccess() ? 1 : 0)
                    .errorMessage(result.getMessage())
                    .content(alarmData.getContent())
                    .sentTime(new Date())
                    .build();
            ruleRepository.saveRecord(record);
        } catch (Exception e) {
            log.warn("Persist alarm record failed, jobId={}, channelId={}",
                    event.getJobInstanceId(), ch.getChannelId(), e);
        }
    }
}
