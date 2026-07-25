package io.yak.ops.application.service.impl;

import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import io.yak.ops.application.service.HoconTemplateService;
import io.yak.ops.application.support.utils.LinkUpConfigUtil;
import io.yak.ops.application.model.vo.HoconTemplateVO;
import io.yak.ops.plugin.spi.enums.DbType;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HoconTemplateServiceImpl implements HoconTemplateService {

    @Override
    public HoconTemplateVO getTemplate(
            DbType sourceDbType,
            String sourcePluginName,
            DbType targetDbType,
            String targetPluginName
    ) {
        DataSourceHoconBuilder sourceBuilder = getBuilder(sourceDbType, sourcePluginName);
        DataSourceHoconBuilder targetBuilder = getBuilder(targetDbType, targetPluginName);

        String sourceTemplate = defaultIfBlank(
                sourceBuilder.sourceTemplate(),
                "# source template is empty\n"
        );
        String sinkTemplate = defaultIfBlank(
                targetBuilder.sinkTemplate(),
                "# sink template is empty\n"
        );

        HoconTemplateVO vo = new HoconTemplateVO();
        vo.setSourceDbType(sourceDbType.name());
        vo.setSourcePluginName(sourcePluginName);
        vo.setTargetDbType(targetDbType.name());
        vo.setTargetPluginName(targetPluginName);
        vo.setSourceTemplate(sourceTemplate);
        vo.setSinkTemplate(sinkTemplate);
        vo.setFullTemplate(
                LinkUpConfigUtil.generateConfig(
                        defaultEnvTemplate(),
                        sourceTemplate,
                        "",
                        sinkTemplate
                )
        );
        return vo;
    }

    private DataSourceHoconBuilder getBuilder(DbType dbType, String pluginName) {
        DataSourceProcessor processor = DataSourceUtils.getDatasourceProcessor(dbType);
        DataSourceHoconBuilder builder = processor.getQueryBuilder(pluginName);

        if (builder == null) {
            throw new IllegalArgumentException(
                    "No DataSourceHoconBuilder found for dbType=" + dbType + ", pluginName=" + pluginName
            );
        }
        return builder;
    }

    private String defaultIfBlank(String value, String defaultValue) {
        return StringUtils.isBlank(value) ? defaultValue : value;
    }

    private String defaultEnvTemplate() {
        return ""
                + "  job.mode = \"BATCH\"\n"
                + "  parallelism = 1\n";
    }
}
