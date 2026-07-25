package io.yak.ops.application.model.dto;

import lombok.Data;
import io.yak.ops.common.enums.UserType;

import java.util.Date;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class UserDTO {

    private Integer id;

    private String userName;

    private String userPassword;

    private String email;

    private String phone;

    private UserType userType;

    private int state;

    private String timeZone;

    private Date createTime;

    private Date updateTime;

}
