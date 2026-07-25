package io.baize.flow.application.service.impl;

import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.application.controller.BaseController;
import io.baize.flow.application.model.Session;
import io.baize.flow.application.model.User;
import io.baize.flow.application.port.SessionRepository;
import io.baize.flow.application.service.SessionService;
import io.baize.flow.common.constants.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.WebUtils;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
public class SessionServiceImpl implements SessionService {
    private static final Logger logger = LoggerFactory.getLogger(SessionService.class);

    private final SessionRepository sessions;

    public SessionServiceImpl(SessionRepository sessions) {
        this.sessions = sessions;
    }

    @Override
    public Session getSession(HttpServletRequest request) {
        String sessionId = request.getHeader(Constants.SESSION_ID);

        if (StringUtils.isBlank(sessionId)) {
            Cookie cookie = WebUtils.getCookie(request, Constants.SESSION_ID);

            if (cookie != null) {
                sessionId = cookie.getValue();
            }
        }

        if (StringUtils.isBlank(sessionId)) {
            return null;
        }

        String ip = BaseController.getClientIpAddress(request);
        logger.debug("get session: {}, ip: {}", sessionId, ip);

        return sessions.findById(sessionId).orElse(null);
    }

    @Override
    @Transactional
    public String createSession(User User, String ip) {
        Session Session = null;

        List<Session> SessionList = sessions.findByUserId(User.getId());

        Date now = new Date();

        /*
         * if you have logged in and are still valid, return directly
         */
        if (CollectionUtils.isNotEmpty(SessionList)) {
            // is session list greater 1 ， delete other ，get one
            if (SessionList.size() > 1) {
                for (int i = 1; i < SessionList.size(); i++) {
                    sessions.deleteById(SessionList.get(i).getId());
                }
            }
            Session = SessionList.get(0);
            if (now.getTime() - Session.getLastLoginTime().getTime() <= Constants.SESSION_TIME_OUT * 1000) {
                /*
                 * updateProcessInstance the latest login time
                 */
                Session.setLastLoginTime(now);
                sessions.save(Session);

                return Session.getId();

            } else {
                /*
                 * session expired, then delete this session first
                 */
                sessions.deleteById(Session.getId());
            }
        }

        // assign new session
        Session = new Session();

        Session.setId(UUID.randomUUID().toString());
        Session.setIp(ip);
        Session.setUserId(User.getId());
        Session.setLastLoginTime(now);

        sessions.save(Session);

        return Session.getId();
    }

    @Override
    public void signOut(String ip, User loginUser) {
        try {
            /*
             * query session by user id and ip
             */
            sessions.findByUserIdAndIp(loginUser.getId(), ip)
                    .ifPresent(session -> sessions.deleteById(session.getId()));
        } catch (Exception e) {
            logger.warn("userId : {} , ip : {} , find more one session", loginUser.getId(), ip);
        }
    }
}
