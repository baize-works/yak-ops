package io.yak.ops.application.security;

import io.yak.ops.application.model.User;
import io.yak.ops.application.service.SessionService;
import io.yak.ops.application.service.UsersService;
import io.yak.ops.common.constants.Constants;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 基于用户名和密码的认证器。
 */
@Service
public class PasswordAuthenticator implements Authenticator {

    private final UsersService usersService;
    private final SessionService sessionService;

    public PasswordAuthenticator(
            UsersService usersService,
            SessionService sessionService) {

        this.usersService = usersService;
        this.sessionService = sessionService;
    }

    @Override
    public Map<String, String> authenticate(
            String userId,
            String password,
            String clientIp) {

        if (StringUtils.isBlank(userId)
                || StringUtils.isBlank(password)) {
            throw new IllegalArgumentException(
                    "用户名和密码不能为空");
        }

        // 查询用户并校验 BCrypt 密码
        User user = usersService.queryUser(userId, password);
        if (user == null) {
            throw new IllegalArgumentException(
                    "用户名或密码错误");
        }

        // 0 通常表示用户被禁用
        if (user.getState() == 0) {
            throw new IllegalStateException(
                    "当前用户已被禁用");
        }

        // 创建登录会话
        String sessionId =
                sessionService.createSession(user, clientIp);

        if (StringUtils.isBlank(sessionId)) {
            throw new IllegalStateException(
                    "创建登录会话失败");
        }

        Map<String, String> cookies =
                new LinkedHashMap<>();

        cookies.put(
                Constants.SESSION_ID,
                sessionId);

        cookies.put(
                Constants.SECURITY_CONFIG_TYPE,
                Constants.SECURITY_CONFIG_TYPE_PASSWORD);

        return cookies;
    }
}