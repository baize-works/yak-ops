package io.baize.flow.infrastructure.alarm;

import com.fasterxml.jackson.databind.ObjectMapper;
import javax.annotation.Resource;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannel;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannelFactory;
import org.apache.seatunnel.plugin.alarm.api.AlarmData;
import org.apache.seatunnel.plugin.alarm.api.AlarmInfo;
import org.apache.seatunnel.plugin.alarm.api.AlarmResult;
import org.apache.seatunnel.plugin.alarm.api.AlarmSeverity;
import io.baize.flow.infrastructure.alarm.engine.AlarmConfigParser;
import io.baize.flow.infrastructure.alarm.plugin.AlarmPluginManager;
import io.baize.flow.application.service.AlarmChannelService;
import io.baize.flow.dao.entity.AlarmChannelEntity;
import io.baize.flow.dao.entity.AlarmRecordEntity;
import io.baize.flow.dao.repository.AlarmChannelDao;
import io.baize.flow.dao.repository.AlarmRecordDao;
import io.baize.flow.dao.repository.AlarmRuleChannelDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Service
public class AlarmChannelServiceAdapter implements AlarmChannelService {

    @Resource
    private AlarmChannelDao alarmChannelDao;

    @Resource
    private AlarmRuleChannelDao alarmRuleChannelDao;

    @Resource
    private AlarmRecordDao alarmRecordDao;

    @Resource
    private AlarmPluginManager alarmPluginManager;

    @Resource
    private ObjectMapper objectMapper;

    @Override
    public AlarmChannelEntity getById(Long id) {
        return alarmChannelDao.queryById(id);
    }

    @Override
    public List<AlarmChannelEntity> list() {
        return alarmChannelDao.queryAll();
    }

    @Override
    public List<AlarmChannelEntity> listEnabled() {
        return alarmChannelDao.listEnabled();
    }

    @Override
    public Long create(AlarmChannelEntity entity) {
        if (entity.getEnabled() == null) {
            entity.setEnabled(1);
        }
        entity.initInsert();
        alarmChannelDao.insert(entity);
        return entity.getId();
    }

    @Override
    public boolean update(AlarmChannelEntity entity) {
        if (entity.getId() == null) {
            return false;
        }
        entity.setUpdateTime(new Date());
        return alarmChannelDao.updateById(entity);
    }

    /**
     * Delete a channel and cascade-clean any rule-channel links that reference
     * it, preventing orphaned associations that would cause rules to match a
     * non-existent channel.
     */
    @Override
    @Transactional
    public boolean delete(Long id) {
        if (id == null) {
            return false;
        }
        alarmRuleChannelDao.deleteByChannelId(id);
        return alarmChannelDao.deleteById(id);
    }

    @Override
    public TestChannelResult testChannel(String channelType, String configJson) {
        TestChannelResult vo = new TestChannelResult();
        AlarmChannelFactory factory = alarmPluginManager.getFactoryMap().get(channelType);
        if (factory == null) {
            vo.setSuccess(false);
            vo.setMessage("未找到通道类型: " + channelType);
            return vo;
        }

        AlarmChannel channel = factory.create();
        AlarmData data = AlarmData.builder()
                .id(0L)
                .title("SeaTunnel 告警连通性测试")
                .content("这是一条测试消息，用于验证告警通道配置是否正确。\n如收到此消息，说明通道连通性正常。")
                .severity(AlarmSeverity.INFO)
                .build();
        AlarmInfo info = AlarmInfo.builder()
                .alarmParams(AlarmConfigParser.parse(objectMapper, configJson))
                .alarmData(data)
                .build();
        AlarmResult result = channel.process(info);

        AlarmRecordEntity record = new AlarmRecordEntity();
        record.setRuleId(0L);
        record.setChannelId(0L);
        record.setChannelType(channelType);
        record.setJobInstanceId(0L);
        record.setJobDefinitionId(0L);
        record.setJobName("连通性测试");
        record.setNewStatus("TEST");
        record.setSeverity(data.getSeverity().name());
        record.setSuccess(result.isSuccess() ? 1 : 0);
        record.setErrorMessage(result.isSuccess() ? null : result.getMessage());
        record.setContent(data.getContent());
        record.setSentTime(new Date());
        record.initInsert();
        alarmRecordDao.insert(record);

        vo.setSuccess(result.isSuccess());
        vo.setMessage(result.getMessage());
        return vo;
    }

}
