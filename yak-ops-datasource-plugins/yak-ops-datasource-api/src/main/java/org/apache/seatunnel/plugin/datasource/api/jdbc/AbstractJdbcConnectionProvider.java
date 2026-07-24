package org.apache.seatunnel.plugin.datasource.api.jdbc;

import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;

import io.baize.flow.plugin.datasource.connection.DefaultConnectionManager;
import io.baize.flow.plugin.datasource.connection.api.DataSourceConfig;
import io.baize.flow.plugin.datasource.connection.api.DataSourceId;
import io.baize.flow.plugin.datasource.connection.api.DriverDescriptor;
import io.baize.flow.plugin.datasource.connection.driver.ClassLoaderStrategy;
import io.baize.flow.plugin.datasource.connection.driver.DefaultDriverProvider;
import io.baize.flow.plugin.datasource.connection.driver.DefaultDriverStorageStrategy;
import io.baize.flow.plugin.datasource.connection.driver.DriverProvider;
import io.baize.flow.plugin.datasource.connection.driver.DriverStorageStrategy;
import io.baize.flow.plugin.datasource.connection.driver.SimpleSharedClassLoaderStrategy;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.datasource.ConnectionParam;

import org.springframework.util.StringUtils;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.stream.Collectors;

/**
 * Abstract JDBC connection provider for Yak Ops.
 *
 * <p>提供以下能力：</p>
 *
 * <ul>
 *     <li>解析 JDBC 驱动类</li>
 *     <li>解析 JDBC 驱动文件路径</li>
 *     <li>动态加载 JDBC 驱动</li>
 *     <li>创建 JDBC Connection</li>
 *     <li>测试数据源连通性</li>
 * </ul>
 *
 * <p>开发环境默认驱动目录：</p>
 *
 * <pre>
 * yak-ops-dist/src/main/jdbc-drivers
 * </pre>
 *
 * <p>发布环境默认驱动目录：</p>
 *
 * <pre>
 * jdbc-drivers
 * </pre>
 *
 * @param <T> JDBC connection parameter type
 */
@Slf4j
public abstract class AbstractJdbcConnectionProvider<
        T extends BaseConnectionParam>
        implements JdbcConnectionProvider {

    /**
     * 自定义 JDBC 驱动目录 JVM 参数。
     *
     * 示例：
     *
     * -Dbaize.flow.jdbc-driver-dir=/opt/yak-ops/jdbc-drivers
     */
    private static final String JDBC_DRIVER_DIRECTORY_PROPERTY =
            "baize.flow.jdbc-driver-dir";

    /**
     * 自定义 JDBC 驱动目录环境变量。
     */
    private static final String JDBC_DRIVER_DIRECTORY_ENV =
            "YAK_OPS_JDBC_DRIVER_DIR";

    /**
     * Yak Ops 安装目录环境变量。
     */
    private static final String YAK_OPS_HOME_ENV =
            "YAK_OPS_HOME";

    /**
     * 开发环境 dist 模块名称。
     */
    private static final String DIST_MODULE_NAME =
            "yak-ops-dist";

    /**
     * JDBC 驱动目录名称。
     */
    private static final String JDBC_DRIVER_DIRECTORY_NAME =
            "jdbc-drivers";

    /**
     * 复用 ConnectionManager，避免每次连接都重新创建 ClassLoader。
     */
    private static final DefaultConnectionManager CONNECTION_MANAGER =
            createConnectionManager();

    static {
        Runtime.getRuntime().addShutdownHook(
                new Thread(
                        CONNECTION_MANAGER::shutdown,
                        "yak-ops-jdbc-driver-shutdown"
                )
        );
    }

    /**
     * 返回默认 JDBC 驱动类。
     *
     * @return JDBC driver class
     */
    protected abstract String defaultDriverClass();

    /**
     * 返回 JDBC 驱动文件位置。
     *
     * <p>推荐子类只返回文件名：</p>
     *
     * <pre>
     * mysql-connector-java-8.0.29.jar
     * </pre>
     *
     * <p>也支持绝对路径和多个以逗号分隔的 JAR：</p>
     *
     * <pre>
     * driver-a.jar,driver-b.jar
     * </pre>
     *
     * @param connectionParam connection parameter
     * @return driver location
     */
    protected abstract String resolveDriverLocation(T connectionParam);

    /**
     * 解析 JDBC 驱动类。
     *
     * <p>配置中指定了 driver，则使用配置值；否则使用默认值。</p>
     */
    protected String resolveDriverClass(T connectionParam) {
        if (StringUtils.hasText(connectionParam.getDriver())) {
            return connectionParam.getDriver().trim();
        }

        String driverClass = defaultDriverClass();

        if (!StringUtils.hasText(driverClass)) {
            throw new IllegalArgumentException(
                    "Default JDBC driver class cannot be empty"
            );
        }

        return driverClass.trim();
    }

    /**
     * JDBC 驱动目录。
     *
     * @return directory path ending with separator
     */
    protected String defaultBaseUrl() {
        return resolveJdbcDriverDirectory().toString()
                + File.separator;
    }

    /**
     * 根据驱动文件名解析绝对路径。
     *
     * @param driverFileName driver jar filename
     * @return absolute driver path
     */
    protected String resolveDriverFile(String driverFileName) {
        if (!StringUtils.hasText(driverFileName)) {
            throw new IllegalArgumentException(
                    "JDBC driver file name cannot be empty"
            );
        }

        return resolveDriverPath(driverFileName).toString();
    }

    /**
     * 密码处理钩子。
     *
     * <p>如果数据库中保存的是加密密码，子类可以覆盖该方法进行解密。</p>
     */
    protected String processPassword(
            T connectionParam,
            String rawPassword) {

        return rawPassword;
    }

    /**
     * 获取 JDBC 连接。
     */
    @Override
    @SneakyThrows
    public Connection getConnection(
            ConnectionParam connectionParam) {

        T param = cast(connectionParam);

        validateConnectionParam(param);

        Properties properties =
                createConnectionProperties(param);

        String driverClass =
                resolveDriverClass(param);

        List<String> driverJarPaths =
                resolveDriverJarPaths(param);

        String fingerprint =
                calculateDriverFingerprint(
                        driverClass,
                        driverJarPaths
                );

        DriverDescriptor descriptor =
                new DriverDescriptor(
                        driverClass,
                        driverJarPaths,
                        fingerprint
                );

        DataSourceId dataSourceId =
                resolveDataSourceId(
                        param,
                        descriptor
                );

        Map<String, Object> extraProperties =
                new HashMap<>();

        for (String name : properties.stringPropertyNames()) {
            extraProperties.put(
                    name,
                    properties.getProperty(name)
            );
        }

        DataSourceConfig dataSourceConfig =
                new DataSourceConfig(
                        dataSourceId,
                        param.getUrl(),
                        properties.getProperty("user"),
                        properties.getProperty("password"),
                        extraProperties,
                        descriptor
                );

        log.debug(
                "Create JDBC connection, dataSourceId={}, url={}, driverClass={}, driverJars={}",
                dataSourceId.value(),
                param.getUrl(),
                driverClass,
                driverJarPaths
        );

        return CONNECTION_MANAGER.getConnection(
                dataSourceConfig
        );
    }

    /**
     * 测试数据源连通性。
     */
    @Override
    public boolean checkDataSourceConnectivity(
            ConnectionParam connectionParam) {

        try (Connection ignored =
                     getConnection(connectionParam)) {

            return true;
        } catch (Exception e) {
            log.error(
                    "Check JDBC connectivity failed: {}",
                    e.getMessage(),
                    e
            );

            return false;
        }
    }

    /**
     * 解析数据源 ID。
     *
     * <p>这里通过 URL、用户名和驱动类生成稳定 ID。</p>
     *
     * <p>如果 BaseConnectionParam 后续包含真实数据库主键，
     * 可以由子类覆盖该方法。</p>
     */
    protected DataSourceId resolveDataSourceId(
            T connectionParam,
            DriverDescriptor descriptor) {

        String identity = String.join(
                "\u0000",
                nullToEmpty(connectionParam.getUrl()),
                nullToEmpty(connectionParam.getUser()),
                nullToEmpty(descriptor.getDriverClass())
        );

        String hash = sha256(identity);

        return new DataSourceId(
                hash.substring(0, 32)
        );
    }

    /**
     * 解析 JDBC 驱动文件列表。
     */
    private List<String> resolveDriverJarPaths(
            T connectionParam) {

        String driverLocation =
                resolveDriverLocation(connectionParam);

        if (!StringUtils.hasText(driverLocation)) {
            throw new IllegalArgumentException(
                    "JDBC driver location cannot be empty"
            );
        }

        List<String> jarPaths =
                Arrays.stream(driverLocation.split(","))
                        .map(String::trim)
                        .filter(StringUtils::hasText)
                        .map(this::resolveDriverPath)
                        .map(Path::toString)
                        .collect(Collectors.toList());

        if (jarPaths.isEmpty()) {
            throw new IllegalArgumentException(
                    "No JDBC driver jar was configured"
            );
        }

        return jarPaths;
    }

    /**
     * 解析单个 JDBC 驱动路径。
     *
     * <p>绝对路径直接使用，相对路径基于 JDBC 驱动目录解析。</p>
     */
    private Path resolveDriverPath(String driverLocation) {
        Path path = Paths.get(driverLocation.trim());

        if (!path.isAbsolute()) {
            path = resolveJdbcDriverDirectory()
                    .resolve(path);
        }

        path = path.toAbsolutePath().normalize();

        if (!Files.exists(path)) {
            throw new IllegalArgumentException(
                    "JDBC driver jar not found: " + path
            );
        }

        if (!Files.isRegularFile(path)) {
            throw new IllegalArgumentException(
                    "JDBC driver path is not a file: " + path
            );
        }

        if (!path.getFileName()
                .toString()
                .toLowerCase()
                .endsWith(".jar")) {

            throw new IllegalArgumentException(
                    "JDBC driver file must be a jar: " + path
            );
        }

        return path;
    }

    /**
     * 查找 JDBC 驱动目录。
     */
    private Path resolveJdbcDriverDirectory() {
        /*
         * 1. JVM 参数：
         *
         * -Dbaize.flow.jdbc-driver-dir=...
         */
        String configuredDirectory =
                System.getProperty(
                        JDBC_DRIVER_DIRECTORY_PROPERTY
                );

        if (StringUtils.hasText(configuredDirectory)) {
            return validateDriverDirectory(
                    Paths.get(configuredDirectory.trim())
            );
        }

        /*
         * 2. 环境变量：
         *
         * YAK_OPS_JDBC_DRIVER_DIR
         */
        configuredDirectory =
                System.getenv(
                        JDBC_DRIVER_DIRECTORY_ENV
                );

        if (StringUtils.hasText(configuredDirectory)) {
            return validateDriverDirectory(
                    Paths.get(configuredDirectory.trim())
            );
        }

        /*
         * 3. Yak Ops Home：
         *
         * ${YAK_OPS_HOME}/jdbc-drivers
         */
        String baizeFlowHome =
                System.getenv(YAK_OPS_HOME_ENV);

        if (StringUtils.hasText(baizeFlowHome)) {
            Path homeDriverDirectory =
                    Paths.get(baizeFlowHome.trim())
                            .resolve(
                                    JDBC_DRIVER_DIRECTORY_NAME
                            );

            if (Files.isDirectory(homeDriverDirectory)) {
                return homeDriverDirectory
                        .toAbsolutePath()
                        .normalize();
            }
        }

        Path workingDirectory =
                Paths.get(
                        System.getProperty("user.dir")
                )
                        .toAbsolutePath()
                        .normalize();

        List<Path> checkedDirectories =
                new ArrayList<>();

        Path currentDirectory =
                workingDirectory;

        while (currentDirectory != null) {
            /*
             * 开发环境：
             *
             * yak-ops/
             * └── yak-ops-dist/
             *     └── src/main/jdbc-drivers
             */
            Path projectDevelopmentDirectory =
                    currentDirectory
                            .resolve(DIST_MODULE_NAME)
                            .resolve("src")
                            .resolve("main")
                            .resolve(
                                    JDBC_DRIVER_DIRECTORY_NAME
                            );

            checkedDirectories.add(
                    projectDevelopmentDirectory
            );

            if (Files.isDirectory(
                    projectDevelopmentDirectory
            )) {
                return projectDevelopmentDirectory
                        .toAbsolutePath()
                        .normalize();
            }

            /*
             * IDEA Working directory 本身是 yak-ops-dist：
             *
             * yak-ops-dist/src/main/jdbc-drivers
             */
            Path fileName =
                    currentDirectory.getFileName();

            if (fileName != null
                    && DIST_MODULE_NAME.equals(
                    fileName.toString())) {

                Path moduleDevelopmentDirectory =
                        currentDirectory
                                .resolve("src")
                                .resolve("main")
                                .resolve(
                                        JDBC_DRIVER_DIRECTORY_NAME
                                );

                checkedDirectories.add(
                        moduleDevelopmentDirectory
                );

                if (Files.isDirectory(
                        moduleDevelopmentDirectory
                )) {
                    return moduleDevelopmentDirectory
                            .toAbsolutePath()
                            .normalize();
                }
            }

            /*
             * 发布环境：
             *
             * yak-ops/
             * ├── bin
             * ├── conf
             * └── jdbc-drivers
             */
            Path runtimeDirectory =
                    currentDirectory.resolve(
                            JDBC_DRIVER_DIRECTORY_NAME
                    );

            checkedDirectories.add(runtimeDirectory);

            if (Files.isDirectory(runtimeDirectory)) {
                return runtimeDirectory
                        .toAbsolutePath()
                        .normalize();
            }

            currentDirectory =
                    currentDirectory.getParent();
        }

        throw new IllegalStateException(
                "JDBC driver directory not found. "
                        + "Working directory: "
                        + workingDirectory
                        + ", checked directories: "
                        + checkedDirectories
                        + ". You can configure it with -D"
                        + JDBC_DRIVER_DIRECTORY_PROPERTY
                        + "=<jdbc-driver-directory>"
        );
    }

    /**
     * 校验手动指定的 JDBC 驱动目录。
     */
    private Path validateDriverDirectory(
            Path directory) {

        Path normalizedDirectory =
                directory
                        .toAbsolutePath()
                        .normalize();

        if (!Files.exists(normalizedDirectory)) {
            throw new IllegalArgumentException(
                    "JDBC driver directory does not exist: "
                            + normalizedDirectory
            );
        }

        if (!Files.isDirectory(normalizedDirectory)) {
            throw new IllegalArgumentException(
                    "JDBC driver path is not a directory: "
                            + normalizedDirectory
            );
        }

        return normalizedDirectory;
    }

    /**
     * 创建连接属性。
     */
    private Properties createConnectionProperties(
            T connectionParam) {

        Properties properties =
                new Properties();

        String user =
                connectionParam.getUser();

        if (!StringUtils.hasText(user)) {
            throw new IllegalArgumentException(
                    "JDBC user cannot be empty"
            );
        }

        properties.setProperty(
                "user",
                user.trim()
        );

        String password =
                connectionParam.getPassword();

        if (!StringUtils.hasText(password)) {
            throw new IllegalArgumentException(
                    "JDBC password cannot be empty"
            );
        }

        String processedPassword =
                processPassword(
                        connectionParam,
                        password
                );

        if (processedPassword == null) {
            throw new IllegalArgumentException(
                    "Processed JDBC password cannot be null"
            );
        }

        properties.setProperty(
                "password",
                processedPassword
        );

        return properties;
    }

    /**
     * 校验连接参数。
     */
    private void validateConnectionParam(
            T connectionParam) {

        if (connectionParam == null) {
            throw new IllegalArgumentException(
                    "Connection parameter cannot be null"
            );
        }

        if (!StringUtils.hasText(
                connectionParam.getUrl())) {

            throw new IllegalArgumentException(
                    "JDBC URL cannot be empty"
            );
        }
    }

    /**
     * 计算 JDBC 驱动指纹。
     *
     * <p>当驱动文件大小或修改时间变化时，指纹也会变化，
     * 从而避免继续使用旧的 ClassLoader 缓存。</p>
     */
    private String calculateDriverFingerprint(
            String driverClass,
            List<String> jarPaths) {

        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            updateDigest(
                    digest,
                    driverClass
            );

            for (String jarPath : jarPaths) {
                Path path =
                        Paths.get(jarPath);

                updateDigest(
                        digest,
                        path.toAbsolutePath()
                                .normalize()
                                .toString()
                );

                updateDigest(
                        digest,
                        String.valueOf(
                                Files.size(path)
                        )
                );

                updateDigest(
                        digest,
                        String.valueOf(
                                Files.getLastModifiedTime(path)
                                        .toMillis()
                        )
                );
            }

            return toHex(
                    digest.digest()
            );
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Calculate JDBC driver fingerprint failed",
                    e
            );
        }
    }

    /**
     * 创建共享 ConnectionManager。
     */
    private static DefaultConnectionManager
    createConnectionManager() {

        DriverStorageStrategy storageStrategy =
                new DefaultDriverStorageStrategy(
                        DefaultDriverStorageStrategy
                                .Mode
                                .SHARED
                );

        ClassLoader parentClassLoader =
                Thread.currentThread()
                        .getContextClassLoader();

        if (parentClassLoader == null) {
            parentClassLoader =
                    AbstractJdbcConnectionProvider
                            .class
                            .getClassLoader();
        }

        ClassLoaderStrategy classLoaderStrategy =
                new SimpleSharedClassLoaderStrategy(
                        parentClassLoader
                );

        DriverProvider driverProvider =
                new DefaultDriverProvider(
                        storageStrategy,
                        classLoaderStrategy
                );

        return new DefaultConnectionManager(
                driverProvider
        );
    }

    /**
     * SHA-256。
     */
    private String sha256(String value) {
        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            return toHex(
                    digest.digest(
                            value.getBytes(
                                    StandardCharsets.UTF_8
                            )
                    )
            );
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Calculate SHA-256 failed",
                    e
            );
        }
    }

    private void updateDigest(
            MessageDigest digest,
            String value) {

        digest.update(
                nullToEmpty(value).getBytes(
                        StandardCharsets.UTF_8
                )
        );

        digest.update((byte) 0);
    }

    private static String toHex(byte[] bytes) {
        StringBuilder builder =
                new StringBuilder(
                        bytes.length * 2
                );

        for (byte value : bytes) {
            builder.append(
                    Character.forDigit(
                            (value >>> 4) & 0x0F,
                            16
                    )
            );

            builder.append(
                    Character.forDigit(
                            value & 0x0F,
                            16
                    )
            );
        }

        return builder.toString();
    }

    private static String nullToEmpty(
            String value) {

        return value == null
                ? ""
                : value;
    }

    /**
     * ConnectionParam 类型转换。
     */
    @SuppressWarnings("unchecked")
    private T cast(ConnectionParam param) {
        if (param == null) {
            throw new IllegalArgumentException(
                    "Connection parameter cannot be null"
            );
        }

        return (T) param;
    }
}