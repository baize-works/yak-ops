package io.yak.ops.application.service;


import io.yak.ops.application.model.Session;
import io.yak.ops.application.model.User;

/**
 * session service
 */
public interface SessionService {

    /**
     * Get a user session without exposing transport-specific request objects.
     *
     * @param sessionId session identifier supplied by the transport layer
     * @param clientIp client address used for diagnostics
     * @return session
     */
    Session getSession(String sessionId, String clientIp);

    /**
     * create session
     *
     * @param userPO user
     * @param ip ip
     * @return session string
     */
    String createSession(User userPO, String ip);

    /**
     * sign out
     * remove ip restrictions
     *
     * @param ip   no use
     * @param loginUserPO login user
     */
    void signOut(String ip, User loginUserPO);
}
