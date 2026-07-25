package io.yak.ops.engine.api;

/** Authentication data required by an engine HTTP endpoint. */
public class EngineClientAuthentication {
    private Boolean authEnabled;
    private String username;
    private String password;

    public Boolean getAuthEnabled() { return authEnabled; }
    public void setAuthEnabled(Boolean authEnabled) { this.authEnabled = authEnabled; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
