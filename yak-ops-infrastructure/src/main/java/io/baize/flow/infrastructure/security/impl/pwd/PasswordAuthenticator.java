package io.baize.flow.infrastructure.security.impl.pwd;

import io.baize.flow.infrastructure.security.impl.AbstractAuthenticator;
import io.baize.flow.application.model.User;

public class PasswordAuthenticator extends AbstractAuthenticator {

    @Override
    public User login(String userId, String password, String extra) {
        return userService.queryUser(userId, password);
    }
}
