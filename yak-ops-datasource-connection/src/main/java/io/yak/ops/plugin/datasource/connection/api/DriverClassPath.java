package io.yak.ops.plugin.datasource.connection.api;

import java.io.Serializable;
import java.net.URL;
import java.util.List;

public final class DriverClassPath implements Serializable {
    private final List<URL> urls;

    public DriverClassPath(List<URL> urls) {
        this.urls = urls;
    }

    public List<URL> getUrls() { return urls; }
}

