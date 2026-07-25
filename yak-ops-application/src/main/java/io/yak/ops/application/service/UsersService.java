package io.yak.ops.application.service;


import io.yak.ops.application.model.User;

/**
 * users service
 */
public interface UsersService  {

    User queryUser(String userId, String password);

    User getUserInfo(User loginUser);

    User getById(int userId);
}
