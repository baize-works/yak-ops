package io.yak.ops.application.service.impl;

import io.yak.ops.application.model.User;
import io.yak.ops.application.port.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;

class UsersServiceImplTest {

    @Test
    void administratorCanLogInWithBCryptPassword() {
        User administrator = new User();
        administrator.setUserName("admin");
        administrator.setUserPassword(new BCryptPasswordEncoder().encode("yak-password"));
        UsersServiceImpl service = new UsersServiceImpl(repositoryReturning(administrator));

        assertSame(administrator, service.queryUser("admin", "yak-password"));
        assertNull(service.queryUser("admin", "wrong-password"));
    }

    private UserRepository repositoryReturning(final User user) {
        return new UserRepository() {
            @Override
            public Optional<User> findByUserName(String userName) {
                return Optional.of(user);
            }

            @Override
            public Optional<User> findById(int userId) {
                return Optional.empty();
            }
        };
    }
}
