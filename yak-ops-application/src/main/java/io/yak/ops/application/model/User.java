package io.yak.ops.application.model;

import io.yak.ops.common.enums.UserType;
import java.util.Date;
import lombok.Data;

/** User data used by application use cases, independent of persistence mappings. */
@Data
public class User {
    private Integer id;
    private String userName;
    private String userPassword;
    private String email;
    private String phone;
    private UserType userType;
    private int state;
    private Date createTime;
    private Date updateTime;
}
