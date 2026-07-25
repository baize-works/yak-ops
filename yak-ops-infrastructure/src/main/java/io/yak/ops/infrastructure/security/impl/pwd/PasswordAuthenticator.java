package io.yak.ops.infrastructure.security.impl.pwd;

import io.yak.ops.infrastructure.security.impl.AbstractAuthenticator;
import io.yak.ops.application.model.User;

public class PasswordAuthenticator extends AbstractAuthenticator {

    @Override
    public User login(String userId, String password, String extra) {
        return userService.queryUser(userId, password);
    }
}
