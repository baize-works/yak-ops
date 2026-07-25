package io.baize.flow.engine.api;

import java.util.Objects;

/** Connection details supplied by the application; adapters never load DAO entities. */
public final class EngineConnectionConfig {

    private final String baseUrl;
    private final String contextPath;
    private final boolean authenticationEnabled;
    private final String username;
    private final String password;

    public EngineConnectionConfig(String baseUrl, String contextPath, boolean authenticationEnabled, String username, String password) {
        Objects.requireNonNull(baseUrl, "baseUrl");
        this.baseUrl = baseUrl;
        this.contextPath = contextPath;
        this.authenticationEnabled = authenticationEnabled;
        this.username = username;
        this.password = password;
    }

    public String baseUrl() { return baseUrl; }


    public String getBaseUrl() { return baseUrl; }

    public String contextPath() { return contextPath; }


    public String getContextPath() { return contextPath; }

    public boolean authenticationEnabled() { return authenticationEnabled; }


    public boolean isAuthenticationEnabled() { return authenticationEnabled; }

    public String username() { return username; }


    public String getUsername() { return username; }

    public String password() { return password; }


    public String getPassword() { return password; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EngineConnectionConfig that = (EngineConnectionConfig) o;
        return java.util.Objects.equals(baseUrl, that.baseUrl) && java.util.Objects.equals(contextPath, that.contextPath) && authenticationEnabled == that.authenticationEnabled && java.util.Objects.equals(username, that.username) && java.util.Objects.equals(password, that.password);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(baseUrl, contextPath, authenticationEnabled, username, password); }

    @Override
    public String toString() {
        return "EngineConnectionConfig[" + "baseUrl=" + baseUrl + ", " + "contextPath=" + contextPath + ", " + "authenticationEnabled=" + authenticationEnabled + ", " + "username=" + username + ", " + "password=" + password + "]";
    }
}
