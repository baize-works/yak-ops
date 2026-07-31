package io.yak.ops.business.resource.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.yak.ops.common.bean.po.resource.ResourcePO;
import org.apache.ibatis.annotations.Mapper;

/** 资源 MyBatis-Plus Mapper。 */
@Mapper
public interface ResourceMapper extends BaseMapper<ResourcePO> {
}
