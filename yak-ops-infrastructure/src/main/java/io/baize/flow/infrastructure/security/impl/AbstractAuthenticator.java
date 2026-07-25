package io.baize.flow.infrastructure.security.impl;

import javax.annotation.Resource;
import io.baize.flow.application.security.Authenticator;
import io.baize.flow.application.security.SecurityConfiguration;
import io.baize.flow.application.model.User;
import io.baize.flow.application.service.SessionService;
import io.baize.flow.application.service.UsersService;
import io.baize.flow.common.constants.Constants;
import io.baize.flow.common.enums.Flag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

public abstract class AbstractAuthenticator implements Authenticator {

    private static final Logger logger = LoggerFactory.getLogger(AbstractAuthenticator.class);

    @Resource
    protected UsersService userService;

    @Resource
    private SessionService sessionService;

    @Resource
    private SecurityConfiguration securityConfig;

    @Override
    public Map<String, String> authenticate(String userId, String password, String extra) {
        User user = login(userId, password, extra);
        if (user == null) {
            throw new RuntimeException("user name or password error");
        }

        if (user.getState() == Flag.NO.ordinal()) {
            throw new RuntimeException("The current user is disabled");
        }

        // create session
        String sessionId = sessionService.createSession(user, extra);
        if (sessionId == null) {
            throw new RuntimeException("create session failed!");
        }

        Map<String, String> data = new HashMap<>();
        data.put(Constants.SESSION_ID, sessionId);
        data.put(Constants.SECURITY_CONFIG_TYPE, securityConfig.getType());
        return data;

    }

    /**
     * user login and return user in db
     *
     * @param userId   user identity field
     * @param password user login password
     * @param extra    extra user login field
     * @return user object in databse
     */
    public abstract User login(String userId, String password, String extra);
}
