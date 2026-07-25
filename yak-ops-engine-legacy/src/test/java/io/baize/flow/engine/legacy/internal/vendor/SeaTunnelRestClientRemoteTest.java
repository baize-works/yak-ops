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
                baseApiUrl != null && !baseApiUrl.isBlank(),
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
                Collections.emptyMap()
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
        return """
                env {
                    job.mode = "BATCH"
                    parallelism = 1
                }

                source {
                    FakeSource {
                        result_table_name = "fake"
                        row.num = 10
                        schema = {
                            fields {
                                id = int
                                name = string
                            }
                        }
                    }
                }

                sink {
                    Console {
                        source_table_name = "fake"
                    }
                }
                """;
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
        return """
                env {
                    job {
                        mode = STREAMING
                    }

                    parallelism = 1
                    checkpoint.interval = 30000
                }

                source {
                    MySQL-CDC {
                        url = "jdbc:mysql://127.0.0.1:3306/test1?allowPublicKeyRetrieval=true&useSSL=false"
                        username = "root"
                        password = "123456"

                        hostname = "127.0.0.1"
                        port = 3306

                        database-names = [
                            "test1"
                        ]

                        table-pattern = "test1\\\\..*"

                        startup {
                            mode = initial
                        }

                        server-id = "5400-5408"
                    }
                }

                transform {
                }

                sink {
                    Jdbc {
                        url = "jdbc:mysql://127.0.0.1:3306/test2?allowPublicKeyRetrieval=true&useSSL=false&rewriteBatchedStatements=true"
                        driver = "com.mysql.cj.jdbc.Driver"
                        username = "root"
                        password = "123456"

                        database = "test2"
                        table = "${table_name}"

                        generate_sink_sql = true
                        primary_keys = ["${primary_key}"]

                        schema_save_mode = "CREATE_SCHEMA_WHEN_NOT_EXIST"
                        data_save_mode = "APPEND_DATA"

                        enable_upsert = true
                        batch_size = 1000
                        max_retries = 3
                    }
                }
                """;
    }

    private String resolveBaseApiUrl() {
        String systemProperty =
                System.getProperty(BASE_API_URL_PROPERTY);

        if (systemProperty != null && !systemProperty.isBlank()) {
            return systemProperty.trim();
        }

        String environmentVariable =
                System.getenv(BASE_API_URL_ENV);

        if (environmentVariable != null
                && !environmentVariable.isBlank()) {
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