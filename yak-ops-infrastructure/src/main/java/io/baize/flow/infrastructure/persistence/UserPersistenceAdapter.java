package io.baize.flow.infrastructure.persistence;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.baize.flow.application.model.User;
import io.baize.flow.application.port.UserRepository;
import io.baize.flow.dao.mapper.UserMapper;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** MyBatis-Plus implementation of the application user port. */
@Repository
@RequiredArgsConstructor
public class UserPersistenceAdapter implements UserRepository {
    private final UserMapper mapper;
    @Override public Optional<User> findByUserName(String userName) {
        return Optional.ofNullable(mapper.selectOne(new LambdaQueryWrapper<io.baize.flow.dao.entity.User>()
                .eq(io.baize.flow.dao.entity.User::getUserName, userName))).map(this::toModel);
    }
    @Override public Optional<User> findById(int userId) { return Optional.ofNullable(mapper.selectById(userId)).map(this::toModel); }
    private User toModel(io.baize.flow.dao.entity.User entity) {
        User user = new User(); user.setId(entity.getId()); user.setUserName(entity.getUserName()); user.setUserPassword(entity.getUserPassword()); user.setEmail(entity.getEmail()); user.setPhone(entity.getPhone()); user.setUserType(entity.getUserType()); user.setState(entity.getState()); user.setCreateTime(entity.getCreateTime()); user.setUpdateTime(entity.getUpdateTime()); return user;
    }
}
