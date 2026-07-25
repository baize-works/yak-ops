package io.yak.ops.application.service.impl;

import io.yak.ops.application.model.User;
import io.yak.ops.application.port.UserRepository;
import io.yak.ops.application.service.UsersService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import io.yak.ops.common.enums.UserType;
import org.springframework.stereotype.Service;

@Service
public class UsersServiceImpl implements UsersService {

    private static final PasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    private final UserRepository users;

    public UsersServiceImpl(UserRepository users) {
        this.users = users;
    }

    @Override
    public User queryUser(String name, String password) {
        User user = users.findByUserName(name).orElse(null);
        if (user == null || !PASSWORD_ENCODER.matches(password, user.getUserPassword())) {
            return null;
        }
        return user;
    }

    @Override
    public User getUserInfo(User loginUser) {
        User User;
        if (loginUser.getUserType() == UserType.ADMIN_USER) {
            User = loginUser;
        } else {
            User = users.findById(loginUser.getId()).orElse(null);
        }
        return User;
    }

    @Override
    public User getById(int userId) {
        return users.findById(userId).orElse(null);
    }
}
