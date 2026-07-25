package io.yak.ops.plugin.datasource.connection.api;

import java.io.Serializable;
import java.util.List;
import java.util.Objects;


public final class DriverDescriptor implements Serializable {
    private final String driverClass;
    private final List<String> jarPaths;


    private final String fingerprint;

    public DriverDescriptor(String driverClass, List<String> jarPaths, String fingerprint) {
        this.driverClass = Objects.requireNonNull(driverClass);
        this.jarPaths = Objects.requireNonNull(jarPaths);
        this.fingerprint = Objects.requireNonNull(fingerprint);
    }

    public String getDriverClass() { return driverClass; }
    public List<String> getJarPaths() { return jarPaths; }
    public String getFingerprint() { return fingerprint; }
}
