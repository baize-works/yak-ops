package io.yak.ops.application.model;

import java.util.Date;
import lombok.Data;

/** Authenticated-session data used by application use cases. */
@Data
public class Session {
    private String id;
    private int userId;
    private Date lastLoginTime;
    private String ip;
}
