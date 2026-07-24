package io.baize.flow.api.controller;

import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import io.baize.flow.api.aspect.AccessLogAnnotation;
import io.baize.flow.api.model.User;
import io.baize.flow.api.service.SessionService;
import io.baize.flow.api.service.UsersService;
import io.baize.flow.common.constants.Constants;
import io.baize.flow.web.contract.dto.UserDTO;
import io.baize.flow.web.contract.response.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;


/**
 * users controller
 */
@RestController
@RequestMapping("/api/v1/users")
public class UsersController extends BaseController {

    @Resource
    private UsersService usersService;

    @Resource
    private SessionService sessionService;

    /**
     * get user info
     *
     * @param loginUser login user
     * @return user info
     */
    @GetMapping(value = "/get-user-info")
    @ResponseStatus(HttpStatus.OK)
    @AccessLogAnnotation
    public Result<User> getUserInfo(@RequestAttribute(value = Constants.SESSION_USER) User loginUser) {
        return Result.buildSuc(usersService.getUserInfo(loginUser));

    }

    @GetMapping("/currentUser")
    public Result<UserDTO> currentUser(HttpServletRequest request) {

        User loginUser = (User) request.getAttribute(Constants.SESSION_USER);

        if (loginUser == null) {
            var session = sessionService.getSession(request);
            if (session == null) {
                return Result.buildFailure("NOT_LOGIN");
            }
            loginUser = usersService.getById(session.getUserId());
        }

        if (loginUser == null) {
            return Result.buildFailure("NOT_LOGIN");
        }

        UserDTO dto = new UserDTO();
        dto.setUserName(loginUser.getUserName());
        return Result.buildSuc(dto);
    }
}
