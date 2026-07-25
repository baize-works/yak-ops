package io.yak.ops.application.port;

import io.yak.ops.application.model.User;
import java.util.Optional;

/** Output port for user persistence. */
public interface UserRepository {
    Optional<User> findByUserName(String userName);
    Optional<User> findById(int userId);
}
