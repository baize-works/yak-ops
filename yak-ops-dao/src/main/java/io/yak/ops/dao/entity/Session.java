package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.util.Date;

/**
 * session
 */
@TableName("t_baize_flow_session")
public class Session {

    /**
     * id
     */
    @TableId(value="id", type=IdType.INPUT)
    private String id;

    /**
     * user id
     */
    private int userId;

    /**
     * last login time
     */
    private Date lastLoginTime;

    /**
     * user login ip
     */
    private String ip;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public Date getLastLoginTime() {
        return lastLoginTime;
    }

    public void setLastLoginTime(Date lastLoginTime) {
        this.lastLoginTime = lastLoginTime;
    }

    @Override
    public String toString() {
        return "Session{" +
                "id=" + id +
                ", userId=" + userId +
                ", ip='" + ip + '\'' +
                ", lastLoginTime=" + lastLoginTime +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }

        Session sessionPO = (Session) o;

        if (userId != sessionPO.userId) {
            return false;
        }
        if (!id.equals(sessionPO.id)) {
            return false;
        }
        if (!lastLoginTime.equals(sessionPO.lastLoginTime)) {
            return false;
        }
        return ip.equals(sessionPO.ip);
    }

    @Override
    public int hashCode() {
        int result = id.hashCode();
        result = 31 * result + userId;
        result = 31 * result + lastLoginTime.hashCode();
        result = 31 * result + ip.hashCode();
        return result;
    }
}
