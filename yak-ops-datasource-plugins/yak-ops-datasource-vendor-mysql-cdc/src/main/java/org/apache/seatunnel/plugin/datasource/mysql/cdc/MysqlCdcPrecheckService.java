package org.apache.seatunnel.plugin.datasource.mysql.cdc;

import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckItem;
import org.apache.seatunnel.plugin.datasource.api.cdc.CdcDatasourcePrecheckResult;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.checker.MysqlCdcBinlogEnabledChecker;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.checker.MysqlCdcBinlogFormatChecker;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.checker.MysqlCdcBinlogRowImageChecker;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.checker.MysqlCdcPrecheckItemChecker;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.checker.MysqlCdcPrivilegeChecker;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.checker.MysqlCdcServerIdChecker;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.context.MysqlCdcPrecheckContext;
import org.apache.seatunnel.plugin.datasource.mysql.cdc.context.MysqlCdcPrecheckContextFactory;

import java.sql.Connection;
import java.util.Arrays;
import java.util.List;

@Slf4j
public class MysqlCdcPrecheckService {

    private final MysqlCdcPrecheckContextFactory contextFactory;

    private final List<MysqlCdcPrecheckItemChecker> checkers;

    public MysqlCdcPrecheckService() {
        this(
                new MysqlCdcPrecheckContextFactory(),
                Arrays.asList(
                        new MysqlCdcBinlogEnabledChecker(),
                        new MysqlCdcBinlogFormatChecker(),
                        new MysqlCdcBinlogRowImageChecker(),
                        new MysqlCdcServerIdChecker(),
                        new MysqlCdcPrivilegeChecker()
                )
        );
    }

    public MysqlCdcPrecheckService(
            MysqlCdcPrecheckContextFactory contextFactory,
            List<MysqlCdcPrecheckItemChecker> checkers) {
        this.contextFactory = contextFactory;
        this.checkers = checkers;
    }

    public CdcDatasourcePrecheckResult check(String connectionParams) {
        CdcDatasourcePrecheckResult result = new CdcDatasourcePrecheckResult();

        MysqlCdcPrecheckContext context;
        try {
            context = contextFactory.create(connectionParams);
        } catch (Exception e) {
            log.warn("Create MySQL CDC precheck context failed", e);

            result.addItem(CdcDatasourcePrecheckItem.fail(
                    "MYSQL_CDC_CONNECTION_PARAMS",
                    "连接参数解析",
                    e.getMessage(),
                    "可解析出 MySQL 连接参数",
                    "MySQL-CDC 数据源连接参数解析失败"
            ));
            result.refreshSuccess();
            return result;
        }

        try (Connection connection = context.openConnection()) {
            for (MysqlCdcPrecheckItemChecker checker : checkers) {
                result.addItem(safeCheck(checker, context, connection));
            }
        } catch (Exception e) {
            log.warn("Open MySQL CDC precheck connection failed", e);

            result.addItem(CdcDatasourcePrecheckItem.fail(
                    "MYSQL_CDC_DIRECT_CONNECTIVITY",
                    "数据库直连",
                    e.getMessage(),
                    "连接成功",
                    "无法通过 MySQL 数据源插件连接数据库，请检查网络、账号、密码或驱动配置"
            ));
        }

        result.refreshSuccess();
        return result;
    }

    private CdcDatasourcePrecheckItem safeCheck(
            MysqlCdcPrecheckItemChecker checker,
            MysqlCdcPrecheckContext context,
            Connection connection) {
        try {
            return checker.check(context, connection);
        } catch (Exception e) {
            log.warn("Execute MySQL CDC precheck item failed, checker={}",
                    checker.getClass().getSimpleName(), e);

            return CdcDatasourcePrecheckItem.fail(
                    checker.code(),
                    checker.name(),
                    e.getMessage(),
                    checker.expectedValue(),
                    "检查项执行异常"
            );
        }
    }
}