package io.baize.flow.application.service;

import io.baize.flow.web.contract.vo.HoconTemplateVO;
import io.baize.flow.plugin.spi.enums.DbType;

public interface HoconTemplateService {
    HoconTemplateVO getTemplate(
            DbType sourceDbType,
            String sourcePluginName,
            DbType targetDbType,
            String targetPluginName
    );
}
