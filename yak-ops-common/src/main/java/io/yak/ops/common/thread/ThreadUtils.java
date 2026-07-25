package io.yak.ops.common.thread;

import lombok.experimental.UtilityClass;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicInteger;

@UtilityClass
public class ThreadUtils {

    private static final Logger logger = LoggerFactory.getLogger(ThreadUtils.class);

    /**
     * Wrapper over newDaemonFixedThreadExecutor.
     *
     * @param threadName threadName
     * @param threadsNum threadsNum
     * @return ExecutorService
     */
    public static ExecutorService newDaemonFixedThreadExecutor(String threadName, int threadsNum) {
        final String threadNamePrefix =
                threadName == null || threadName.trim().isEmpty() ? "yak-ops-worker" : threadName;
        final AtomicInteger threadNumber = new AtomicInteger(1);
        ThreadFactory threadFactory = runnable -> {
            Thread thread = new Thread(
                    runnable, threadNamePrefix + "-" + threadNumber.getAndIncrement());
            thread.setDaemon(true);
            return thread;
        };
        return Executors.newFixedThreadPool(threadsNum, threadFactory);
    }

    /**
     * Sleep in given mills, this is not accuracy.
     */
    public static void sleep(final long millis) {
        try {
            Thread.sleep(millis);
        } catch (final InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
            logger.error("Current thread sleep error", interruptedException);
        }
    }
}
