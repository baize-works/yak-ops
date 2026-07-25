package io.baize.flow.plugin.datasource.connection.driver;

import io.baize.flow.plugin.datasource.connection.api.DataSourceId;
import io.baize.flow.plugin.datasource.connection.api.DriverClassPath;
import io.baize.flow.plugin.datasource.connection.api.DriverDescriptor;

import java.io.File;
import java.io.Serializable;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 一个“默认可用”的 DriverStorageStrategy：
 * - 仅处理本地文件 jar（上传/远程下载不在这里做）
 * - 支持 SHARED/ISOLATED 两种目录结构
 * - SHARED 模式使用引用计数 + 定时清理
 * <p>
 * 目录结构示例：
 * - SHARED:   {baseDir}/jdbc-drivers/shared/{fingerprint}/xxx.jar
 * - ISOLATED: {baseDir}/jdbc-drivers/isolated/{dataSourceId}/{fingerprint}/xxx.jar
 */
public class DefaultDriverStorageStrategy implements DriverStorageStrategy {

    public enum Mode {SHARED, ISOLATED}

    private final Mode mode;

    private final RefCountRegistry refCountRegistry;

    public DefaultDriverStorageStrategy( Mode mode) {
        this(mode,  new InMemoryRefCountRegistry());
    }

    public DefaultDriverStorageStrategy(
            Mode mode,
            RefCountRegistry refCountRegistry) {
        this.mode = Objects.requireNonNull(mode);
        this.refCountRegistry = Objects.requireNonNull(refCountRegistry);
    }

    @Override
    public DriverClassPath prepare(DataSourceId dataSourceId, DriverDescriptor descriptor) {
        Objects.requireNonNull(dataSourceId, "dataSourceId");
        Objects.requireNonNull(descriptor, "descriptor");

        List<URL> urls = new ArrayList<>();
        for (String jarPath : descriptor.getJarPaths()) {
            if (jarPath == null || jarPath.trim().isEmpty()) {
                continue;
            }
            File src = new File(jarPath.trim());
            if (!src.exists() || !src.isFile()) {
                throw new IllegalArgumentException("JDBC driver jar not found: " + src.getAbsolutePath());
            }

            try {
                urls.add(src.toURI().toURL());
            } catch (MalformedURLException e) {
                throw new RuntimeException("Bad jar url: " + src.getAbsolutePath(), e);
            }
        }

        String key = registryKey(dataSourceId, descriptor);
        refCountRegistry.increase(key);

        return new DriverClassPath(urls);
    }

    @Override
    public void release(DataSourceId dataSourceId, DriverDescriptor descriptor) {
        Objects.requireNonNull(dataSourceId, "dataSourceId");
        Objects.requireNonNull(descriptor, "descriptor");

        String key = registryKey(dataSourceId, descriptor);
        long refs = refCountRegistry.decrease(key);
    }

    @Override
    public void shutdown() {

    }


    private String registryKey(DataSourceId dataSourceId, DriverDescriptor descriptor) {
        if (mode == Mode.SHARED) {
            return "shared::" + descriptor.getFingerprint();
        }
        return "isolated::" + dataSourceId.value() + "::" + descriptor.getFingerprint();
    }


    // --------------------------- RefCount Registry ---------------------------

    public interface RefCountRegistry extends Serializable {
        void increase(String key);

        long decrease(String key);

        long getRefs(String key);

        void remove(String key);

        void touch(String key);

        Optional<Long> getLastTouchedMillis(String key);
    }

    public static class InMemoryRefCountRegistry implements RefCountRegistry {
        private static class Entry {
            final AtomicLong refs = new AtomicLong(0);
            volatile long lastTouched = System.currentTimeMillis();
        }

        private final Map<String, Entry> map = new ConcurrentHashMap<>();

        @Override
        public void increase(String key) {
            map.compute(key, (k, v) -> {
                if (v == null) v = new Entry();
                v.refs.incrementAndGet();
                v.lastTouched = System.currentTimeMillis();
                return v;
            });
        }

        @Override
        public long decrease(String key) {
            return map.compute(key, (k, v) -> {
                if (v == null) return null;
                long after = v.refs.decrementAndGet();
                v.lastTouched = System.currentTimeMillis();
                return v;
            }) == null ? 0 : map.get(key).refs.get();
        }

        @Override
        public long getRefs(String key) {
            Entry e = map.get(key);
            return e == null ? 0 : e.refs.get();
        }

        @Override
        public void remove(String key) {
            map.remove(key);
        }

        @Override
        public void touch(String key) {
            Entry e = map.get(key);
            if (e != null) {
                e.lastTouched = System.currentTimeMillis();
            }
        }

        @Override
        public Optional<Long> getLastTouchedMillis(String key) {
            Entry e = map.get(key);
            return e == null ? Optional.empty() : Optional.of(e.lastTouched);
        }
    }
}

/*
 * 依赖类：DriverStorageStrategy / DriverClassPath 来自我之前给你的结构。
 * 你只要确保包名一致，或者自己调整 import 即可。
 */
