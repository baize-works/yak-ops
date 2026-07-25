package io.yak.ops.application.service;

import io.yak.ops.web.contract.vo.HoconTemplateVO;
import io.yak.ops.plugin.spi.enums.DbType;

public interface HoconTemplateService {
    HoconTemplateVO getTemplate(
            DbType sourceDbType,
            String sourcePluginName,
            DbType targetDbType,
            String targetPluginName
    );
}
