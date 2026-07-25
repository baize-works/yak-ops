package io.baize.flow.application.service;


import io.baize.flow.application.model.User;

/**
 * users service
 */
public interface UsersService  {

    User queryUser(String userId, String password);

    User getUserInfo(User loginUser);

    User getById(int userId);
}
