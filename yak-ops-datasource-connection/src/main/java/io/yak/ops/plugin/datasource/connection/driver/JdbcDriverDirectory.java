package io.yak.ops.plugin.datasource.connection.driver;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public final class JdbcDriverDirectory {

    private static final String DRIVER_DIR_PROPERTY =
            "yak.ops.jdbc-driver-dir";

    private static final String DRIVER_DIR_ENV =
            "YAK_OPS_JDBC_DRIVER_DIR";

    private static final String YAK_OPS_HOME_ENV =
            "YAK_OPS_HOME";

    private JdbcDriverDirectory() {
    }

    public static Path getDriverDirectory() {
        // 1. JVM 参数：
        // -Dyak.ops.jdbc-driver-dir=/opt/yak-ops/jdbc-drivers
        String configuredDir = trimToNull(
                System.getProperty(DRIVER_DIR_PROPERTY)
        );

        if (configuredDir != null) {
            return ensureDirectory(Paths.get(configuredDir));
        }

        // 2. 独立环境变量
        configuredDir = trimToNull(
                System.getenv(DRIVER_DIR_ENV)
        );

        if (configuredDir != null) {
            return ensureDirectory(Paths.get(configuredDir));
        }

        // 3. YAK_OPS_HOME
        String baizeFlowHome = trimToNull(
                System.getenv(YAK_OPS_HOME_ENV)
        );

        if (baizeFlowHome != null) {
            return ensureDirectory(
                    Paths.get(baizeFlowHome, "jdbc-drivers")
            );
        }

        String userDir = System.getProperty("user.dir");

        // 4. 发布包运行目录
        Path runtimeDirectory = Paths.get(
                userDir,
                "jdbc-drivers"
        );

        if (Files.isDirectory(runtimeDirectory)) {
            return runtimeDirectory.toAbsolutePath().normalize();
        }

        // 5. 本地 IDEA 开发环境
        Path developmentDirectory = Paths.get(
                userDir,
                "yak-ops-dist",
                "src",
                "main",
                "jdbc-drivers"
        );

        if (Files.isDirectory(developmentDirectory)) {
            return developmentDirectory.toAbsolutePath().normalize();
        }

        // 6. 默认创建运行目录
        return ensureDirectory(runtimeDirectory);
    }

    public static Path resolve(String location) {
        if (location == null || location.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "JDBC driver location cannot be empty"
            );
        }

        Path path = Paths.get(location.trim());

        if (!path.isAbsolute()) {
            path = getDriverDirectory().resolve(path);
        }

        return path.toAbsolutePath().normalize();
    }

    private static Path ensureDirectory(Path directory) {
        Path normalized = directory.toAbsolutePath().normalize();

        try {
            Files.createDirectories(normalized);
        } catch (IOException e) {
            throw new IllegalStateException(
                    "Cannot create JDBC driver directory: " + normalized,
                    e
            );
        }

        return normalized;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static String getBaseUrl() {
        return getDriverDirectory().toString() + File.separator;
    }
}
