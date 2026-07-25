package io.baize.flow.infrastructure.persistence;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.baize.flow.application.model.Session;
import io.baize.flow.application.port.SessionRepository;
import io.baize.flow.dao.mapper.SessionMapper;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** MyBatis-Plus implementation of the application session port. */
@Repository
@RequiredArgsConstructor
public class SessionPersistenceAdapter implements SessionRepository {
    private final SessionMapper mapper;
    @Override public Optional<Session> findById(String id) { return Optional.ofNullable(mapper.selectById(id)).map(this::toModel); }
    @Override public List<Session> findByUserId(int userId) { return mapper.selectList(new LambdaQueryWrapper<io.baize.flow.dao.entity.Session>().eq(io.baize.flow.dao.entity.Session::getUserId, userId)).stream().map(this::toModel).collect(java.util.stream.Collectors.toList()); }
    @Override public Optional<Session> findByUserIdAndIp(int userId, String ip) { return Optional.ofNullable(mapper.selectOne(new LambdaQueryWrapper<io.baize.flow.dao.entity.Session>().eq(io.baize.flow.dao.entity.Session::getUserId, userId).eq(io.baize.flow.dao.entity.Session::getIp, ip))).map(this::toModel); }
    @Override public void save(Session session) { io.baize.flow.dao.entity.Session entity = toEntity(session); if (mapper.selectById(entity.getId()) == null) mapper.insert(entity); else mapper.updateById(entity); }
    @Override public void deleteById(String sessionId) { mapper.deleteById(sessionId); }
    private Session toModel(io.baize.flow.dao.entity.Session entity) { Session session = new Session(); session.setId(entity.getId()); session.setUserId(entity.getUserId()); session.setIp(entity.getIp()); session.setLastLoginTime(entity.getLastLoginTime()); return session; }
    private io.baize.flow.dao.entity.Session toEntity(Session session) { io.baize.flow.dao.entity.Session entity = new io.baize.flow.dao.entity.Session(); entity.setId(session.getId()); entity.setUserId(session.getUserId()); entity.setIp(session.getIp()); entity.setLastLoginTime(session.getLastLoginTime()); return entity; }
}
