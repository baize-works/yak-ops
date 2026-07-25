package io.baize.flow.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import javax.annotation.Resource;
import lombok.NonNull;
import io.baize.flow.dao.entity.SeaTunnelClientNode;
import io.baize.flow.dao.mapper.SeaTunnelClientNodeMapper;
import io.baize.flow.dao.repository.BaseDao;
import io.baize.flow.dao.repository.SeaTunnelClientNodeDao;
import org.springframework.stereotype.Repository;

import java.util.Collections;
import java.util.Date;
import java.util.List;

@Repository
public class SeaTunnelClientNodeDaoImpl
        extends BaseDao<SeaTunnelClientNode, SeaTunnelClientNodeMapper>
        implements SeaTunnelClientNodeDao {

    @Resource
    private SeaTunnelClientNodeMapper seaTunnelClientNodeMapper;

    public SeaTunnelClientNodeDaoImpl(@NonNull SeaTunnelClientNodeMapper seaTunnelClientNodeMapper) {
        super(seaTunnelClientNodeMapper);
    }

    @Override
    public List<SeaTunnelClientNode> selectByClientId(Long clientId) {
        if (clientId == null || clientId <= 0) {
            return java.util.Collections.emptyList();
        }

        LambdaQueryWrapper<SeaTunnelClientNode> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SeaTunnelClientNode::getClientId, clientId)
                .orderByAsc(SeaTunnelClientNode::getNodeRole)
                .orderByDesc(SeaTunnelClientNode::getActiveMaster)
                .orderByAsc(SeaTunnelClientNode::getId);

        List<SeaTunnelClientNode> records = seaTunnelClientNodeMapper.selectList(wrapper);
        return records == null ? java.util.Collections.emptyList() : records;
    }

    @Override
    public List<SeaTunnelClientNode> selectByClientIdAndRole(
            Long clientId,
            String nodeRole
    ) {
        if (clientId == null || clientId <= 0 || nodeRole == null || nodeRole.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }

        LambdaQueryWrapper<SeaTunnelClientNode> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SeaTunnelClientNode::getClientId, clientId)
                .eq(SeaTunnelClientNode::getNodeRole, nodeRole.trim())
                .orderByDesc(SeaTunnelClientNode::getActiveMaster)
                .orderByAsc(SeaTunnelClientNode::getHealthStatus)
                .orderByAsc(SeaTunnelClientNode::getId);

        List<SeaTunnelClientNode> records = seaTunnelClientNodeMapper.selectList(wrapper);
        return records == null ? java.util.Collections.emptyList() : records;
    }

    @Override
    public void deleteByClientId(Long clientId) {
        if (clientId == null || clientId <= 0) {
            return;
        }

        LambdaQueryWrapper<SeaTunnelClientNode> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SeaTunnelClientNode::getClientId, clientId);

        seaTunnelClientNodeMapper.delete(wrapper);
    }

    @Override
    public void clearActiveMaster(Long clientId) {
        if (clientId == null || clientId <= 0) {
            return;
        }

        LambdaUpdateWrapper<SeaTunnelClientNode> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(SeaTunnelClientNode::getClientId, clientId)
                .eq(SeaTunnelClientNode::getNodeRole, "MASTER")
                .set(SeaTunnelClientNode::getActiveMaster, false)
                .set(SeaTunnelClientNode::getUpdateTime, new Date());

        seaTunnelClientNodeMapper.update(null, wrapper);
    }
}
