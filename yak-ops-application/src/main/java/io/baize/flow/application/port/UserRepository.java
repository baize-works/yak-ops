package io.baize.flow.application.port;

import io.baize.flow.application.model.User;
import java.util.Optional;

/** Output port for user persistence. */
public interface UserRepository {
    Optional<User> findByUserName(String userName);
    Optional<User> findById(int userId);
}
