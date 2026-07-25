package io.yak.ops.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import io.yak.ops.dao.entity.AlarmRuleEntity;

@Mapper
public interface AlarmRuleMapper extends BaseMapper<AlarmRuleEntity> {
}
