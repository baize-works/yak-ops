package org.apache.seatunnel.plugin.datasource.api.cdc;

import lombok.extern.slf4j.Slf4j;
import io.yak.ops.plugin.spi.enums.DbType;

import java.util.ArrayList;
import java.util.List;
import java.util.ServiceLoader;

@Slf4j
public final class CdcDatasourcePrecheckProviderFactory {

    private static final List<CdcDatasourcePrecheckProvider> PROVIDERS = new ArrayList<>();

    static {
        ServiceLoader<CdcDatasourcePrecheckProvider> loader =
                ServiceLoader.load(CdcDatasourcePrecheckProvider.class);

        for (CdcDatasourcePrecheckProvider provider : loader) {
            PROVIDERS.add(provider);
            log.info("Loaded CDC datasource precheck provider: {}",
                    provider.getClass().getName());
        }
    }

    private CdcDatasourcePrecheckProviderFactory() {
    }

    public static CdcDatasourcePrecheckProvider getProvider(DbType dbType, String pluginName) {
        return PROVIDERS.stream()
                .filter(provider -> provider.supports(dbType, pluginName))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "No CDC datasource precheck provider found, dbType="
                                + dbType
                                + ", pluginName="
                                + pluginName
                ));
    }
}
