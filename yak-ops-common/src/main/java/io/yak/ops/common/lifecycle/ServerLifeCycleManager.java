package io.yak.ops.common.lifecycle;

import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@UtilityClass
public class ServerLifeCycleManager {

    private static volatile ServerStatus serverStatus = ServerStatus.RUNNING;

    private static long serverStartupTime = System.currentTimeMillis();

    public static long getServerStartupTime() {
        return serverStartupTime;
    }

    public static boolean isRunning() {
        return serverStatus == ServerStatus.RUNNING;
    }

    public static boolean isStopped() {
        return serverStatus == ServerStatus.STOPPED;
    }

    public static ServerStatus getServerStatus() {
        return serverStatus;
    }

    /**
     * Change the current server state to {@link ServerStatus#WAITING}, only {@link ServerStatus#RUNNING} can change to {@link ServerStatus#WAITING}.
     *
     * @throws ServerLifeCycleException if change failed.
     */
    public static synchronized void toWaiting() throws ServerLifeCycleException {
        if (isStopped()) {
            throw new ServerLifeCycleException("The current server is already stopped, cannot change to waiting");
        }

        if (serverStatus == ServerStatus.WAITING) {
            log.warn("The current server is already at waiting status, cannot change to waiting");
            return;
        }
        serverStatus = ServerStatus.WAITING;
    }

    /**
     * Recover from {@link ServerStatus#WAITING} to {@link ServerStatus#RUNNING}.
     */
    public static synchronized void recoverFromWaiting() throws ServerLifeCycleException {
        if (isStopped()) {
            throw new ServerLifeCycleException("The current server is already stopped, cannot recovery");
        }

        if (serverStatus == ServerStatus.RUNNING) {
            log.warn("The current server status is already running, cannot recover form waiting");
            return;
        }
        serverStartupTime = System.currentTimeMillis();
        serverStatus = ServerStatus.RUNNING;
    }

    public static synchronized boolean toStopped() {
        if (serverStatus == ServerStatus.STOPPED) {
            return false;
        }
        serverStatus = ServerStatus.STOPPED;
        return true;
    }

}
