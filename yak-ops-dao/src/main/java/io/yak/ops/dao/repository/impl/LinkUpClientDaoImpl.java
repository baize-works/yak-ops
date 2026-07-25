package io.yak.ops.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import javax.annotation.Resource;
import lombok.NonNull;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.dao.mapper.LinkUpClientMapper;
import io.yak.ops.dao.repository.BaseDao;
import io.yak.ops.dao.repository.LinkUpClientDao;
import org.springframework.stereotype.Repository;

import java.util.Collections;
import java.util.Date;
import java.util.List;

@Repository
public class LinkUpClientDaoImpl
        extends BaseDao<LinkUpClient, LinkUpClientMapper>
        implements LinkUpClientDao {

    @Resource
    private LinkUpClientMapper linkUpClientMapper;

    public LinkUpClientDaoImpl(@NonNull LinkUpClientMapper linkUpClientMapper) {
        super(linkUpClientMapper);
    }

    @Override
    public LinkUpClient selectById(Long clientId) {
        return linkUpClientMapper.selectById(clientId);
    }

    @Override
    public List<LinkUpClient> listProbeClients() {
        LambdaQueryWrapper<LinkUpClient> wrapper = new LambdaQueryWrapper<>();
        wrapper.isNotNull(LinkUpClient::getId)
                .isNotNull(LinkUpClient::getBaseUrl)
                .ne(LinkUpClient::getBaseUrl, "")
                .orderByDesc(LinkUpClient::getCreateTime);

        List<LinkUpClient> records = linkUpClientMapper.selectList(wrapper);
        return records == null ? java.util.Collections.emptyList() : records;
    }

    @Override
    public int updateHealthStatus(Long clientId, Integer healthStatus, Date heartbeatTime) {
        if (clientId == null || clientId <= 0 || healthStatus == null) {
            return 0;
        }

        LambdaUpdateWrapper<LinkUpClient> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(LinkUpClient::getId, clientId)
                .set(LinkUpClient::getHealthStatus, healthStatus)
                .set(LinkUpClient::getUpdateTime, new Date());

        if (heartbeatTime != null) {
            wrapper.set(LinkUpClient::getHeartbeatTime, heartbeatTime);
        }

        return linkUpClientMapper.update(null, wrapper);
    }
}
