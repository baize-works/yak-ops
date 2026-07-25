package io.yak.ops.common.thread;

/**
 * thread local context
 */
public class ThreadLocalContext {

    public static final ThreadLocal<String> timezoneThreadLocal = new ThreadLocal<>();

    public static ThreadLocal<String> getTimezoneThreadLocal() {
        return timezoneThreadLocal;
    }
}
