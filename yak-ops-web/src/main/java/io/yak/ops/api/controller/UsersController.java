package io.yak.ops.api.controller;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.Cookie;
import io.yak.ops.api.aspect.AccessLogAnnotation;
import io.yak.ops.application.model.User;
import io.yak.ops.application.service.SessionService;
import io.yak.ops.application.service.UsersService;
import io.yak.ops.common.constants.Constants;
import io.yak.ops.application.model.dto.UserDTO;
import io.yak.ops.application.model.response.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.WebUtils;
import org.apache.commons.lang3.StringUtils;


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
            String sessionId = request.getHeader(Constants.SESSION_ID);
            if (StringUtils.isBlank(sessionId)) {
                Cookie cookie = WebUtils.getCookie(request, Constants.SESSION_ID);
                sessionId = cookie == null ? null : cookie.getValue();
            }
            Session session = sessionService.getSession(sessionId, getClientIpAddress(request));
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
