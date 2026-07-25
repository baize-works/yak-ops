package io.yak.ops.infrastructure.metrics;

import lombok.extern.slf4j.Slf4j;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
public class JobFileLogger {

    private final String logFilePath;

    /**
     * Internal async log queue
     */
    private final LinkedBlockingQueue<String> logQueue =
            new LinkedBlockingQueue<>(10_000);

    /**
     * Background writer thread running flag
     */
    private final AtomicBoolean running = new AtomicBoolean(true);

    /**
     * Thread-safe time formatter
     */
    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private BufferedWriter writer;
    private Thread workerThread;

    public JobFileLogger(String logFilePath) {
        this.logFilePath = logFilePath;
        init();
    }

    /**
     * Initialize writer and background worker thread
     */
    private void init() {
        try {
            File file = new File(logFilePath);
            File parent = file.getParentFile();
            if (parent != null && !parent.exists()) {
                parent.mkdirs();
            }

            writer = new BufferedWriter(new FileWriter(file, true), 8192);

            workerThread = new Thread(this::consumeLoop, "JobFileLogger-Worker");
            workerThread.setDaemon(true);
            workerThread.start();

        } catch (IOException e) {
            log.error("Failed to initialize JobFileLogger: {}", logFilePath, e);
        }
    }
    /**
     * Background consumer loop
     */
    private void consumeLoop() {
        try {
            while (running.get() || !logQueue.isEmpty()) {
                String msg = logQueue.poll();
                if (msg != null) {
                    writer.write(msg);
                    writer.newLine();
                } else {
                    Thread.sleep(10);
                }
            }
        } catch (Exception e) {
            log.error("Logger worker failed", e);
        } finally {
            try {
                if (writer != null) {
                    writer.flush();
                    writer.close();
                }
            } catch (IOException ignored) {
            }
        }
    }

    public void info(String message) {
        offer("INFO", message);
    }

    public void warn(String message) {
        offer("WARN", message);
    }

    public void error(String message) {
        offer("ERROR", message);
    }

    public void error(String message, Throwable t) {
        offer("ERROR", message);
        if (t != null) {
            offer("ERROR", stackTraceToString(t));
        }
    }

    private void offer(String level, String message) {
        String time = FORMATTER.format(LocalDateTime.now());
        String formatted = "[" + time + "] [" + level + "] " + message;

        // Non-blocking; drop log if queue is full
        logQueue.offer(formatted);
    }

    private String stackTraceToString(Throwable t) {
        StringBuilder sb = new StringBuilder();
        for (StackTraceElement element : t.getStackTrace()) {
            sb.append("\tat ").append(element).append("\n");
        }
        return sb.toString();
    }

    /**
     * Gracefully shutdown logger
     */
    public void close() {
        running.set(false);
        try {
            if (workerThread != null) {
                workerThread.join(3000);
            }
        } catch (InterruptedException ignored) {
        }
    }
}
