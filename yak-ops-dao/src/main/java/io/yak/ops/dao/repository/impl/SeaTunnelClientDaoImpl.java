package io.yak.ops.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import javax.annotation.Resource;
import lombok.NonNull;
import io.yak.ops.dao.entity.SeaTunnelClient;
import io.yak.ops.dao.mapper.SeaTunnelClientMapper;
import io.yak.ops.dao.repository.BaseDao;
import io.yak.ops.dao.repository.SeaTunnelClientDao;
import org.springframework.stereotype.Repository;

import java.util.Collections;
import java.util.Date;
import java.util.List;

@Repository
public class SeaTunnelClientDaoImpl
        extends BaseDao<SeaTunnelClient, SeaTunnelClientMapper>
        implements SeaTunnelClientDao {

    @Resource
    private SeaTunnelClientMapper seaTunnelClientMapper;

    public SeaTunnelClientDaoImpl(@NonNull SeaTunnelClientMapper seaTunnelClientMapper) {
        super(seaTunnelClientMapper);
    }

    @Override
    public SeaTunnelClient selectById(Long clientId) {
        return seaTunnelClientMapper.selectById(clientId);
    }

    @Override
    public List<SeaTunnelClient> listProbeClients() {
        LambdaQueryWrapper<SeaTunnelClient> wrapper = new LambdaQueryWrapper<>();
        wrapper.isNotNull(SeaTunnelClient::getId)
                .isNotNull(SeaTunnelClient::getBaseUrl)
                .ne(SeaTunnelClient::getBaseUrl, "")
                .orderByDesc(SeaTunnelClient::getCreateTime);

        List<SeaTunnelClient> records = seaTunnelClientMapper.selectList(wrapper);
        return records == null ? java.util.Collections.emptyList() : records;
    }

    @Override
    public int updateHealthStatus(Long clientId, Integer healthStatus, Date heartbeatTime) {
        if (clientId == null || clientId <= 0 || healthStatus == null) {
            return 0;
        }

        LambdaUpdateWrapper<SeaTunnelClient> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(SeaTunnelClient::getId, clientId)
                .set(SeaTunnelClient::getHealthStatus, healthStatus)
                .set(SeaTunnelClient::getUpdateTime, new Date());

        if (heartbeatTime != null) {
            wrapper.set(SeaTunnelClient::getHeartbeatTime, heartbeatTime);
        }

        return seaTunnelClientMapper.update(null, wrapper);
    }
}
