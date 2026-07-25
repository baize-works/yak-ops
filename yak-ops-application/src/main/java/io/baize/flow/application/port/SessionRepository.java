package io.baize.flow.application.port;

import io.baize.flow.application.model.Session;
import java.util.List;
import java.util.Optional;

/** Output port for session persistence. */
public interface SessionRepository {
    Optional<Session> findById(String sessionId);
    List<Session> findByUserId(int userId);
    Optional<Session> findByUserIdAndIp(int userId, String ip);
    void save(Session session);
    void deleteById(String sessionId);
}
