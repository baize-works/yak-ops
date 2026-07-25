package io.yak.ops.application.job.handler.multi;

import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.web.contract.dto.config.GuideMultiJobContent;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class GuideMultiTableMatchResolver {

    public List<String> resolveSourceTables(GuideMultiJobContent content) {
        if (content == null || content.getTableMatch() == null) {
            return java.util.Collections.emptyList();
        }

        GuideMultiJobContent.TableMatchConfig tableMatch = content.getTableMatch();

        if (CollectionUtils.isNotEmpty(tableMatch.getTables())) {
            return cleanTables(tableMatch.getTables());
        }

        /*
         * 如果 mode = 2 / 3 时只传 keyword，
         * 这里后续应该接 datasource catalog 查询真实表列表。
         *
         * 例如：
         * dataSourceCatalogApi.listTable(source.datasourceId, keyword)
         */
        return java.util.Collections.emptyList();
    }

    public List<String> resolveSinkTables(GuideMultiJobContent content) {
        List<String> sourceTables = resolveSourceTables(content);

        /*
         * 目前 DTO 没有单独的 target table mapping，
         * 所以默认 source table 和 sink table 同名。
         *
         * 后续如果支持表名改写，可以在这里扩展：
         * source_user -> ods_user
         */
        return new ArrayList<>(sourceTables);
    }

    private List<String> cleanTables(List<String> tables) {
        List<String> result = new ArrayList<>();

        for (String table : tables) {
            if (StringUtils.isNotBlank(table)) {
                result.add(table.trim());
            }
        }

        return result;
    }
}
