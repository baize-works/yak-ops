package io.yak.ops.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import javax.annotation.Resource;
import lombok.NonNull;
import io.yak.ops.dao.entity.LinkUpClientNode;
import io.yak.ops.dao.mapper.LinkUpClientNodeMapper;
import io.yak.ops.dao.repository.BaseDao;
import io.yak.ops.dao.repository.LinkUpClientNodeDao;
import org.springframework.stereotype.Repository;

import java.util.Collections;
import java.util.Date;
import java.util.List;

@Repository
public class LinkUpClientNodeDaoImpl
        extends BaseDao<LinkUpClientNode, LinkUpClientNodeMapper>
        implements LinkUpClientNodeDao {

    @Resource
    private LinkUpClientNodeMapper linkUpClientNodeMapper;

    public LinkUpClientNodeDaoImpl(@NonNull LinkUpClientNodeMapper linkUpClientNodeMapper) {
        super(linkUpClientNodeMapper);
    }

    @Override
    public List<LinkUpClientNode> selectByClientId(Long clientId) {
        if (clientId == null || clientId <= 0) {
            return java.util.Collections.emptyList();
        }

        LambdaQueryWrapper<LinkUpClientNode> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LinkUpClientNode::getClientId, clientId)
                .orderByAsc(LinkUpClientNode::getNodeRole)
                .orderByDesc(LinkUpClientNode::getActiveMaster)
                .orderByAsc(LinkUpClientNode::getId);

        List<LinkUpClientNode> records = linkUpClientNodeMapper.selectList(wrapper);
        return records == null ? java.util.Collections.emptyList() : records;
    }

    @Override
    public List<LinkUpClientNode> selectByClientIdAndRole(
            Long clientId,
            String nodeRole
    ) {
        if (clientId == null || clientId <= 0 || nodeRole == null || nodeRole.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }

        LambdaQueryWrapper<LinkUpClientNode> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LinkUpClientNode::getClientId, clientId)
                .eq(LinkUpClientNode::getNodeRole, nodeRole.trim())
                .orderByDesc(LinkUpClientNode::getActiveMaster)
                .orderByAsc(LinkUpClientNode::getHealthStatus)
                .orderByAsc(LinkUpClientNode::getId);

        List<LinkUpClientNode> records = linkUpClientNodeMapper.selectList(wrapper);
        return records == null ? java.util.Collections.emptyList() : records;
    }

    @Override
    public void deleteByClientId(Long clientId) {
        if (clientId == null || clientId <= 0) {
            return;
        }

        LambdaQueryWrapper<LinkUpClientNode> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LinkUpClientNode::getClientId, clientId);

        linkUpClientNodeMapper.delete(wrapper);
    }

    @Override
    public void clearActiveMaster(Long clientId) {
        if (clientId == null || clientId <= 0) {
            return;
        }

        LambdaUpdateWrapper<LinkUpClientNode> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(LinkUpClientNode::getClientId, clientId)
                .eq(LinkUpClientNode::getNodeRole, "MASTER")
                .set(LinkUpClientNode::getActiveMaster, false)
                .set(LinkUpClientNode::getUpdateTime, new Date());

        linkUpClientNodeMapper.update(null, wrapper);
    }
}
