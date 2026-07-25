package io.yak.ops.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import io.yak.ops.dao.entity.CdcServerIdAllocation;

import java.util.List;

public interface CdcServerIdAllocationMapper extends BaseMapper<CdcServerIdAllocation> {

    @Update("UPDATE t_yak_ops_cdc_server_id_allocation SET active = NULL, released_time = NOW(), update_time = NOW() WHERE job_definition_id = #{jobDefinitionId} AND active = 1")
    int releaseActiveByJobDefinitionId(Long jobDefinitionId);

    @Select({
            "<script>",
            "SELECT server_id FROM t_yak_ops_cdc_server_id_allocation",
            "WHERE pool_id = #{poolId} AND active = 1",
            "<if test='serverIds != null and serverIds.size() > 0'>",
            "AND server_id IN",
            "<foreach collection='serverIds' item='serverId' open='(' separator=',' close=')'>#{serverId}</foreach>",
            "</if>",
            "FOR UPDATE",
            "</script>"
    })
    List<Long> selectActiveServerIdsForUpdate(@Param("poolId") Long poolId,
                                              @Param("serverIds") List<Long> serverIds);

    @Select("SELECT server_id FROM t_yak_ops_cdc_server_id_allocation WHERE pool_id = #{poolId} AND active = 1 FOR UPDATE")
    List<Long> selectActiveServerIdsByPoolForUpdate(Long poolId);
}
