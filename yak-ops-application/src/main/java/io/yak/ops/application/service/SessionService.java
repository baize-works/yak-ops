package io.yak.ops.application.service;


import javax.servlet.http.HttpServletRequest;
import io.yak.ops.application.model.Session;
import io.yak.ops.application.model.User;

/**
 * session service
 */
public interface SessionService {

    /**
     * get user session from request
     *
     * @param request request
     * @return session
     */
    Session getSession(HttpServletRequest request);

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
