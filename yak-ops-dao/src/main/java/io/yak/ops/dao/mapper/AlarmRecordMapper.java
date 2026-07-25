package io.yak.ops.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import io.yak.ops.dao.entity.AlarmRecordEntity;

@Mapper
public interface AlarmRecordMapper extends BaseMapper<AlarmRecordEntity> {
}
