package io.baize.flow.engine.legacy.internal.vendor;

import io.baize.flow.engine.legacy.internal.vendor.rest.SeaTunnelClientResolver;
import io.baize.flow.engine.legacy.LegacyRestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Remote integration tests for SeaTunnel Zeta REST API.
 *
 * <p>This test class requires an externally running Zeta Engine.
 *
 * <p>Zeta REST address can be configured by:
 *
 * <pre>
 * Environment variable:
 * SEATUNNEL_ZETA_BASE_API_URL=http://192.168.1.100:8080
 *
 * JVM system property:
 * -Dseatunnel.zeta.base-api-url=http://192.168.1.100:8080
 * </pre>
 *
 * <p>If neither configuration is provided, all remote tests will be skipped.
 */
@Tag("remote-integration")
class LegacyRestClientRemoteTest {

    /**
     * Fake client id, only used to trigger SeaTunnelClientResolver.
     */
    private static final Long CLIENT_ID = 1L;

    private static final String BASE_API_URL_ENV =
            "SEATUNNEL_ZETA_BASE_API_URL";

    private static final String BASE_API_URL_PROPERTY =
            "seatunnel.zeta.base-api-url";

    private LegacyRestClient seaTunnelRestClient;

    @BeforeEach
    void setUp() {
        String baseApiUrl = resolveBaseApiUrl();

        assumeTrue(
                baseApiUrl != null && !baseApiUrl.trim().isEmpty(),
                () -> String.format(
                        "Remote Zeta tests are skipped because neither "
                                + "environment variable %s nor JVM property %s is configured.",
                        BASE_API_URL_ENV,
                        BASE_API_URL_PROPERTY
                )
        );

        SeaTunnelClientResolver resolver =
                mock(SeaTunnelClientResolver.class);

        when(resolver.resolveBaseApiUrl(anyLong()))
                .thenReturn(removeTrailingSlash(baseApiUrl));

        // No Basic Auth by default.
        // If Zeta Engine enables Basic Auth, return LegacyClientAuthentication here.
        when(resolver.resolveAuth(anyLong()))
                .thenReturn(null);

        seaTunnelRestClient = new LegacyRestClient(
                new RestTemplate(),
                resolver
        );
    }

    @Test
    void shouldCallOverview() {
        Map<?, ?> result = seaTunnelRestClient.overview(
                CLIENT_ID,
                java.util.Collections.emptyMap()
        );

        assertNotNull(result);

        System.out.println("overview result:");
        System.out.println(result);
    }

    @Test
    void shouldCallRunningJobs() {
        List<?> result = seaTunnelRestClient.runningJobs(CLIENT_ID);

        assertNotNull(result);

        System.out.println("running jobs result:");
        System.out.println(result);
    }

    @Test
    void shouldCallFinishedJobs() {
        List<?> result = seaTunnelRestClient.finishedJobs(
                CLIENT_ID,
                null
        );

        assertNotNull(result);

        System.out.println("finished jobs result:");
        System.out.println(result);
    }

    @Test
    void shouldCallSystemMonitoringInformation() {
        List<?> result =
                seaTunnelRestClient.systemMonitoringInformation(CLIENT_ID);

        assertNotNull(result);

        System.out.println("system monitoring result:");
        System.out.println(result);
    }

    /**
     * This test will really submit a job to Zeta Engine.
     * Remove @Disabled when you want to test job submission.
     */
    @Disabled("This test will submit a real SeaTunnel job to Zeta Engine.")
    @Test
    void shouldSubmitSimpleJobByText() {
        Map<?, ?> result = seaTunnelRestClient.submitJobText(
                CLIENT_ID,
                simpleFakeSourceToConsoleJob(),
                "hocon",
                null,
                "remote-rest-test-fake-source-to-console",
                false
        );

        assertNotNull(result);

        System.out.println("submit job result:");
        System.out.println(result);
    }

    private String simpleFakeSourceToConsoleJob() {
        return "env {\n"
                + "    job.mode = \"BATCH\"\n"
                + "    parallelism = 1\n"
                + "}\n"
                + "\n"
                + "source {\n"
                + "    FakeSource {\n"
                + "        result_table_name = \"fake\"\n"
                + "        row.num = 10\n"
                + "        schema = {\n"
                + "            fields {\n"
                + "                id = int\n"
                + "                name = string\n"
                + "            }\n"
                + "        }\n"
                + "    }\n"
                + "}\n"
                + "\n"
                + "sink {\n"
                + "    Console {\n"
                + "        source_table_name = \"fake\"\n"
                + "    }\n"
                + "}";
    }

    /**
     * This test will submit a real MySQL CDC full database sync streaming job
     * to Zeta Engine.
     *
     * <p>It will sync all tables under source database test1 to target
     * database test2.
     *
     * <p>Remove @Disabled when you want to really submit this job.
     */
    @Disabled(
            "This test will submit a real MySQL CDC full database "
                    + "streaming job to Zeta Engine."
    )
    @Test
    void shouldSubmitMysqlCdcFullDatabaseSyncJob() {
        Map<?, ?> result = seaTunnelRestClient.submitJobText(
                CLIENT_ID,
                mysqlCdcFullDatabaseToJdbcJob(),
                "hocon",
                null,
                "remote-rest-test-mysql-cdc-full-database-sync",
                false
        );

        assertNotNull(result);

        System.out.println(
                "submit mysql cdc full database sync job result:"
        );
        System.out.println(result);
    }

    private String mysqlCdcFullDatabaseToJdbcJob() {
        return "env {\n"
                + "    job {\n"
                + "        mode = STREAMING\n"
                + "    }\n"
                + "\n"
                + "    parallelism = 1\n"
                + "    checkpoint.interval = 30000\n"
                + "}\n"
                + "\n"
                + "source {\n"
                + "    MySQL-CDC {\n"
                + "        url = \"jdbc:mysql://127.0.0.1:3306/test1?allowPublicKeyRetrieval=true&useSSL=false\"\n"
                + "        username = \"root\"\n"
                + "        password = \"123456\"\n"
                + "\n"
                + "        hostname = \"127.0.0.1\"\n"
                + "        port = 3306\n"
                + "\n"
                + "        database-names = [\n"
                + "            \"test1\"\n"
                + "        ]\n"
                + "\n"
                + "        table-pattern = \"test1\\\\\\\\..*\"\n"
                + "\n"
                + "        startup {\n"
                + "            mode = initial\n"
                + "        }\n"
                + "\n"
                + "        server-id = \"5400-5408\"\n"
                + "    }\n"
                + "}\n"
                + "\n"
                + "transform {\n"
                + "}\n"
                + "\n"
                + "sink {\n"
                + "    Jdbc {\n"
                + "        url = \"jdbc:mysql://127.0.0.1:3306/test2?allowPublicKeyRetrieval=true&useSSL=false&rewriteBatchedStatements=true\"\n"
                + "        driver = \"com.mysql.cj.jdbc.Driver\"\n"
                + "        username = \"root\"\n"
                + "        password = \"123456\"\n"
                + "\n"
                + "        database = \"test2\"\n"
                + "        table = \"${table_name}\"\n"
                + "\n"
                + "        generate_sink_sql = true\n"
                + "        primary_keys = [\"${primary_key}\"]\n"
                + "\n"
                + "        schema_save_mode = \"CREATE_SCHEMA_WHEN_NOT_EXIST\"\n"
                + "        data_save_mode = \"APPEND_DATA\"\n"
                + "\n"
                + "        enable_upsert = true\n"
                + "        batch_size = 1000\n"
                + "        max_retries = 3\n"
                + "    }\n"
                + "}";
    }

    private String resolveBaseApiUrl() {
        String systemProperty =
                System.getProperty(BASE_API_URL_PROPERTY);

        if (systemProperty != null && !systemProperty.trim().isEmpty()) {
            return systemProperty.trim();
        }

        String environmentVariable =
                System.getenv(BASE_API_URL_ENV);

        if (environmentVariable != null
                && !environmentVariable.trim().isEmpty()) {
            return environmentVariable.trim();
        }

        return null;
    }

    private String removeTrailingSlash(String url) {
        while (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }

        return url;
    }
}
