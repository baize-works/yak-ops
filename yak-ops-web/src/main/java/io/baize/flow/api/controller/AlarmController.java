package io.baize.flow.api.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.annotation.Resource;
import lombok.Data;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannelFactory;
import io.baize.flow.application.port.AlarmChannelCatalog;
import io.baize.flow.application.service.AlarmChannelService;
import io.baize.flow.application.service.AlarmRecordService;
import io.baize.flow.application.service.AlarmRuleService;
import io.baize.flow.dao.entity.AlarmChannelEntity;
import io.baize.flow.dao.entity.AlarmRecordEntity;
import io.baize.flow.dao.entity.AlarmRuleChannelEntity;
import io.baize.flow.dao.entity.AlarmRuleEntity;
import io.baize.flow.web.contract.response.Result;
import io.baize.flow.plugin.spi.form.FormFieldConfig;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@Tag(name = "ALARM_TAG")
@RequestMapping("/api/v1/alarm")
public class AlarmController {

    @Resource
    private AlarmChannelService alarmChannelService;

    @Resource
    private AlarmRuleService alarmRuleService;

    @Resource
    private AlarmRecordService alarmRecordService;

    @Resource
    private AlarmChannelCatalog alarmPluginManager;

    // -------------------- channel types (from SPI) --------------------

    @GetMapping("/channel-types")
    @Operation(summary = "listChannelTypes", description = "List all alarm channel types discovered via SPI")
    public Result<List<ChannelTypeVO>> listChannelTypes() {
        List<ChannelTypeVO> list = alarmPluginManager.getFactoryMap().entrySet().stream()
                .map(e -> {
                    AlarmChannelFactory factory = e.getValue();
                    ChannelTypeVO vo = new ChannelTypeVO();
                    vo.setChannelType(factory.name());
                    vo.setDisplayName(factory.name());
                    vo.setConfigFields(factory.params());
                    return vo;
                })
                .collect(java.util.stream.Collectors.toList());
        return Result.buildSuc(list);
    }

    // -------------------- channels --------------------

    @GetMapping("/channels")
    @Operation(summary = "listChannels", description = "List all alarm channel instances")
    public Result<List<AlarmChannelEntity>> listChannels() {
        return Result.buildSuc(alarmChannelService.list());
    }

    @PostMapping("/channels")
    @Operation(summary = "saveChannel", description = "Create or update an alarm channel instance")
    public Result<Long> saveChannel(@RequestBody AlarmChannelEntity entity) {
        if (entity.getId() == null) {
            return Result.buildSuc(alarmChannelService.create(entity));
        }
        return Result.build(alarmChannelService.update(entity), entity.getId());
    }

    @DeleteMapping("/channels/{id}")
    @Operation(summary = "deleteChannel", description = "Delete an alarm channel instance")
    public Result<Boolean> deleteChannel(@PathVariable("id") Long id) {
        return Result.buildSuc(alarmChannelService.delete(id));
    }

    @PostMapping("/channels/test")
    @Operation(summary = "testChannel", description = "Send a test alarm to verify channel connectivity")
    public Result<AlarmChannelService.TestChannelResult> testChannel(@RequestBody TestChannelCommand cmd) {
        return Result.buildSuc(alarmChannelService.testChannel(cmd.getChannelType(), cmd.getConfigJson()));
    }

    // -------------------- rules --------------------

    @GetMapping("/rules")
    @Operation(summary = "listRules", description = "List all alarm rules")
    public Result<List<AlarmRuleEntity>> listRules() {
        return Result.buildSuc(alarmRuleService.list());
    }

    @PostMapping("/rules")
    @Operation(summary = "saveRule", description = "Create or update an alarm rule with linked channels")
    public Result<Long> saveRule(@RequestBody AlarmRuleService.AlarmRuleCommand command) {
        if (command.getId() == null) {
            return Result.buildSuc(alarmRuleService.create(command));
        }
        return Result.build(alarmRuleService.update(command), command.getId());
    }

    @DeleteMapping("/rules/{id}")
    @Operation(summary = "deleteRule", description = "Delete an alarm rule")
    public Result<Boolean> deleteRule(@PathVariable("id") Long id) {
        return Result.buildSuc(alarmRuleService.delete(id));
    }

    @GetMapping("/rules/{id}/channels")
    @Operation(summary = "listRuleChannels", description = "List channel ids linked to a rule")
    public Result<List<Long>> listRuleChannels(@PathVariable("id") Long id) {
        List<Long> ids = alarmRuleService.listChannels(id).stream()
                .map(AlarmRuleChannelEntity::getChannelId)
                .collect(java.util.stream.Collectors.toList());
        return Result.buildSuc(ids);
    }

    @GetMapping("/rules/all-channels")
    @Operation(summary = "listAllRuleChannels", description = "List all rule-channel links for batch loading")
    public Result<List<AlarmRuleChannelEntity>> listAllRuleChannels() {
        return Result.buildSuc(alarmRuleService.listAllChannels());
    }

    // -------------------- records --------------------

    @GetMapping("/records")
    @Operation(summary = "pageRecords", description = "Page alarm delivery records with optional filters")
    public Result<RecordPageVO> pageRecords(
            @RequestParam(value = "pageNo", defaultValue = "1") int pageNo,
            @RequestParam(value = "pageSize", defaultValue = "10") int pageSize,
            @RequestParam(value = "jobInstanceId", required = false) Long jobInstanceId,
            @RequestParam(value = "channelType", required = false) String channelType,
            @RequestParam(value = "severity", required = false) String severity,
            @RequestParam(value = "success", required = false) Integer success) {
        IPage<AlarmRecordEntity> page = alarmRecordService.page(
                pageNo, pageSize, jobInstanceId, channelType, severity, success);
        RecordPageVO vo = new RecordPageVO();
        vo.setList(page.getRecords());
        vo.setTotal(page.getTotal());
        return Result.buildSuc(vo);
    }

    @Data
    public static class ChannelTypeVO {
        private String channelType;
        private String displayName;
        private List<FormFieldConfig> configFields = new ArrayList<>();
    }

    @Data
    public static class TestChannelCommand {
        private String channelType;
        private String configJson;
    }

    @Data
    public static class RecordPageVO {
        private List<AlarmRecordEntity> list;
        private long total;
    }
}
