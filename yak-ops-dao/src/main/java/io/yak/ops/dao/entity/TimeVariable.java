package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_baize_flow_time_variable")
public class TimeVariable extends BaseEntity{

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 变量名称，如 biz_date / start_time / end_time
     */
    private String paramName;

    /**
     * 变量说明
     */
    private String paramDesc;

    /**
     * SYSTEM / CUSTOM
     */
    private String variableSource;

    /**
     * FIXED / DYNAMIC
     */
    private String valueType;

    /**
     * 输出时间格式
     */
    private String timeFormat;

    /**
     * 固定值或默认值
     */
    private String defaultValue;

    /**
     * 动态表达式
     */
    private String expression;

    /**
     * 示例值
     */
    private String exampleValue;

    /**
     * 是否启用
     */
    private Boolean enabled;

    /**
     * 备注
     */
    private String remark;

}
