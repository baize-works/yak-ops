package io.yak.ops.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import io.yak.ops.dao.entity.AlarmChannelEntity;

@Mapper
public interface AlarmChannelMapper extends BaseMapper<AlarmChannelEntity> {
}
