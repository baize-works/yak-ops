package io.yak.ops.plugin.datasource.connection.driver;


import io.yak.ops.plugin.datasource.connection.api.DataSourceId;
import io.yak.ops.plugin.datasource.connection.api.DriverClassPath;
import io.yak.ops.plugin.datasource.connection.api.DriverDescriptor;

import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * SHARED：同 fingerprint 的 driver 共享同一个 URLClassLoader
 * - getOrCreate：refs++
 * - release：refs--，到 0 时 close + remove
 */
public class SimpleSharedClassLoaderStrategy implements ClassLoaderStrategy {

    private final ClassLoader parent;

    private final ConcurrentMap<String, Holder> holders = new ConcurrentHashMap<>();

    public SimpleSharedClassLoaderStrategy(ClassLoader parent) {
        this.parent = parent != null ? parent : ClassLoader.getSystemClassLoader();
    }

    @Override
    public ManagedClassLoader getOrCreate(
            DataSourceId dataSourceId,
            DriverDescriptor descriptor,
            DriverClassPath classPath) {

        Objects.requireNonNull(descriptor, "descriptor");
        Objects.requireNonNull(classPath, "classPath");

        String key = buildKey(descriptor);
        Holder holder = holders.compute(key, (k, existing) -> {
            if (existing == null) {
                URLClassLoader cl = new URLClassLoader(toUrlArray(classPath.getUrls()), parent);
                Holder h = new Holder(k, cl);
                h.refs.incrementAndGet();
                return h;
            }
            existing.refs.incrementAndGet();
            return existing;
        });

        return new RefCountedManagedClassLoader(key, holder);
    }

    @Override
    public void release(DataSourceId dataSourceId, DriverDescriptor descriptor) {
        if (descriptor == null) {
            return;
        }
        String key = buildKey(descriptor);

        holders.computeIfPresent(key, (k, holder) -> {
            long refs = holder.refs.decrementAndGet();
            if (refs <= 0) {
                safeClose(holder.classLoader);
                return null; // remove
            }
            return holder;
        });
    }

    @Override
    public void shutdown() {
        holders.forEach((k, holder) -> safeClose(holder.classLoader));
        holders.clear();
    }

    private String buildKey(DriverDescriptor descriptor) {
        // SHARED 的 key：只看 fingerprint（你也可以加 driverClass，避免极端情况下 fingerprint 复用）
        return "shared::" + descriptor.getFingerprint();
    }

    private static URL[] toUrlArray(List<URL> urls) {
        return urls == null ? new URL[0] : urls.toArray(new URL[0]);
    }

    private static void safeClose(URLClassLoader cl) {
        try {
            cl.close();
        } catch (IOException ignored) {
        }
    }

    private static final class Holder {
        final String key;
        final URLClassLoader classLoader;
        final AtomicLong refs = new AtomicLong(0);

        Holder(String key, URLClassLoader classLoader) {
            this.key = key;
            this.classLoader = classLoader;
        }
    }

    private static final class RefCountedManagedClassLoader implements ManagedClassLoader {
        private final String key;
        private final Holder holder;

        RefCountedManagedClassLoader(String key, Holder holder) {
            this.key = key;
            this.holder = holder;
        }

        @Override
        public ClassLoader classLoader() {
            return holder.classLoader;
        }

        @Override
        public String key() {
            return key;
        }

        @Override
        public void close() {

        }
    }
}
