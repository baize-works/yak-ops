package io.baize.flow.infrastructure.network;

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.net.InetAddress;

/**
 * Clint Status Check Utils
 */
@Slf4j
public class PingUtil {

    // Ping timeout (milliseconds) - 6 seconds
    private static final int PING_TIMEOUT = 6000;

    /**
     * Simple ping check
     * @param ipAddress IP address
     * @return Whether reachable
     */
    public static boolean checkClient(String ipAddress) {
        return checkClient(ipAddress, PING_TIMEOUT);
    }

    /**
     * Ping check with specified timeout
     * @param ipAddress IP address
     * @param timeout Timeout (milliseconds)
     * @return Whether reachable
     */
    public static boolean checkClient(String ipAddress, int timeout) {
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            log.warn("IP address is empty");
            return false;
        }

        try {
            InetAddress inetAddress = InetAddress.getByName(ipAddress);
            boolean reachable = inetAddress.isReachable(timeout);

            log.debug("Ping check - Address: {}, Result: {}", ipAddress, reachable);
            return reachable;

        } catch (IOException e) {
            log.debug("Ping check failed - Address: {}, Error: {}", ipAddress, e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Ping check exception - Address: {}", ipAddress, e);
            return false;
        }
    }
}
