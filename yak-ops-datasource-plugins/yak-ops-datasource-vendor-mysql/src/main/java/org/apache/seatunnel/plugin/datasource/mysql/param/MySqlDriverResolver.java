package org.apache.seatunnel.plugin.datasource.mysql.param;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;

import java.io.File;
import java.net.URL;
import java.net.URLClassLoader;
import java.sql.Connection;
import java.sql.Driver;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Properties;
import java.util.Set;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

@Slf4j
public class MySqlDriverResolver {

    private static final String DRIVER_SERVICE_FILE = "META-INF/services/java.sql.Driver";

    private MySqlDriverResolver() {
    }

    public static String resolveDriver(MySQLConnectionParam param) {
        if (param == null) {
            return DataSourceConstants.COM_MYSQL_CJ_JDBC_DRIVER;
        }

        if (StringUtils.isNotBlank(param.getDriver())) {
            return param.getDriver();
        }

        File driverJar = resolveDriverJar(param.getDriverLocation());

        List<String> candidates = buildDriverCandidates(driverJar);

        for (String candidate : candidates) {
            if (canConnect(param, driverJar, candidate)) {
                log.info("Resolved MySQL driver class: {}", candidate);
                return candidate;
            }
        }

        log.warn(
                "Failed to resolve available MySQL driver from jar: {}, fallback to {}",
                driverJar == null ? null : driverJar.getAbsolutePath(),
                DataSourceConstants.COM_MYSQL_CJ_JDBC_DRIVER
        );

        return DataSourceConstants.COM_MYSQL_CJ_JDBC_DRIVER;
    }

    private static File resolveDriverJar(String driverLocation) {
        if (StringUtils.isBlank(driverLocation)) {
            return null;
        }

        File file = new File(driverLocation);
        if (file.isAbsolute()) {
            return file;
        }

        String baseDir = System.getProperty("user.dir")
                + File.separator
                + "jdbc-drivers"
                + File.separator;

        return new File(baseDir + driverLocation);
    }

    private static List<String> buildDriverCandidates(File driverJar) {
        Set<String> candidates = new LinkedHashSet<>();

        candidates.addAll(discoverDriversFromServiceFile(driverJar));

        /*
         * MySQL Connector/J 8.x
         */
        candidates.add(DataSourceConstants.COM_MYSQL_CJ_JDBC_DRIVER);

        /*
         * MySQL Connector/J 5.x
         */
        candidates.add(DataSourceConstants.COM_MYSQL_JDBC_DRIVER);

        return new ArrayList<>(candidates);
    }

    private static List<String> discoverDriversFromServiceFile(File driverJar) {
        List<String> drivers = new ArrayList<>();

        if (driverJar == null || !driverJar.exists() || !driverJar.isFile()) {
            return drivers;
        }

        try (JarFile jarFile = new JarFile(driverJar)) {
            JarEntry entry = jarFile.getJarEntry(DRIVER_SERVICE_FILE);
            if (entry == null) {
                return drivers;
            }

            try (java.io.BufferedReader reader =
                         new java.io.BufferedReader(
                                 new java.io.InputStreamReader(
                                         jarFile.getInputStream(entry)))) {

                String line;
                while ((line = reader.readLine()) != null) {
                    String driverClass = line.trim();

                    if (driverClass.isEmpty() || driverClass.startsWith("#")) {
                        continue;
                    }

                    drivers.add(driverClass);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to discover jdbc driver from jar service file", e);
        }

        return drivers;
    }

    private static boolean canConnect(
            MySQLConnectionParam param,
            File driverJar,
            String driverClassName) {

        if (StringUtils.isBlank(driverClassName)) {
            return false;
        }

        // Mandatory Parameters in Defensive Programming
        if(StringUtils.isBlank(param.getUrl())){
            return false;
        }
        if(StringUtils.isBlank(param.getUser())){
            return false;
        }
        if(StringUtils.isBlank(param.getPassword())){
            return false;
        }

        try {
            Driver driver = loadDriver(driverJar, driverClassName);
            DriverManager.registerDriver(new MySqlDriverShim(driver));

            Properties properties = new Properties();
            properties.put("user", param.getUser());
            properties.put("password", param.getPassword());

            try (Connection connection =
                         DriverManager.getConnection(param.getUrl(), properties);
                 Statement statement = connection.createStatement();
                 ResultSet resultSet = statement.executeQuery("SELECT VERSION()")) {

                if (resultSet.next()) {
                    log.info(
                            "MySQL driver {} connected successfully, mysql version: {}",
                            driverClassName,
                            resultSet.getString(1)
                    );
                }

                return true;
            }
        } catch (Exception e) {
            log.info("MySQL driver {} connect failed, try next candidate", driverClassName, e);
            return false;
        }
    }

    private static Driver loadDriver(File driverJar, String driverClassName) throws Exception {
        ClassLoader classLoader;

        if (driverJar != null && driverJar.exists()) {
            URL jarUrl = driverJar.toURI().toURL();
            classLoader = new URLClassLoader(
                    new URL[]{jarUrl},
                    Thread.currentThread().getContextClassLoader()
            );
        } else {
            classLoader = Thread.currentThread().getContextClassLoader();
        }

        Class<?> clazz = Class.forName(driverClassName, true, classLoader);
        Object instance = clazz.getDeclaredConstructor().newInstance();

        if (!(instance instanceof Driver)) {
            throw new IllegalStateException(driverClassName + " is not a java.sql.Driver");
        }

        return (Driver) instance;
    }
}