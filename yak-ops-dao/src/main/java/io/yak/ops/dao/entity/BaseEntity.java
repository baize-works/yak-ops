package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import lombok.Data;
import io.yak.ops.common.utils.CodeGenerateUtils;

import java.io.Serializable;
import java.util.Date;

@Data
public class BaseEntity implements Serializable {
    /**
     * 主键
     */
    @TableId(type = IdType.INPUT)
    protected Long id;

    /**
     * 创建时间
     */
    protected Date createTime;


    /**
     * 更新时间
     */
    protected Date updateTime;


    /**
     * 初始化更新信息
     */
    public void initUpdate() {
        this.updateTime = new Date();
    }


    /**
     * 初始化插入信息
     */
    public void initInsert() {
        this.id = CodeGenerateUtils.getInstance().genCode();

        this.createTime = new Date();
        this.updateTime = new Date();
    }


    /**
     * 初始化插入信息
     */
    public void initInsertWithNoId() {

        this.createTime = new Date();
        this.updateTime = new Date();
    }
}
