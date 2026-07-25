package io.yak.ops.application.model.response;

import lombok.Getter;
import io.yak.ops.common.constants.Constants;

/**
 * 返回状态
 */
@Getter
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public enum ResultStatus {
    GATEWAY_INVALID_REQUEST(-1, "invalid request"),

    SUCCESS(Constants.SUCCESS, "成功"),
    FAIL(1, "失败"),

    /**
     * 操作错误，[1000, 2000)
     * ------------------------------------------------------------------------------------------
     */
    OPERATION_FAILED(1001, "操作失败"),
    OPERATION_FORBIDDEN(1002, "操作禁止"),

    /**
     * 参数错误，[2000, 3000)
     */
    PARAM_ILLEGAL(2000, "参数错误"),
    NO_FIND_SUB_CLASS(2055, "找不到实现类"),
    ADMIN_TASK_ERROR(2056, "admin任务异常"),
    NO_FIND_METHOD(2057, "找不到实现方法"),




    /**
     * 检查错误，[7000, 8000)
     */
    NOT_EXIST(7100, "不存在"),
    DUPLICATION(7200, "已存在"),
    IN_USE(7400, "已被使用"),


    /**
     * 调用错误, [8000, 9000)
     */
    KAFKA_OPERATE_FAILED(8010, "Kafka操作失败"),
    KAFKA_CONNECTOR_OPERATE_FAILED(8011, "KafkaConnect操作失败"),
    KAFKA_CONNECTOR_READ_FAILED(8012, "KafkaConnect读失败"),
    MYSQL_OPERATE_FAILED(8020, "MySQL操作失败"),
    ZK_OPERATE_FAILED(8030, "ZK操作失败"),
    ZK_FOUR_LETTER_CMD_FORBIDDEN(8031, "ZK四字命令被禁止"),
    ES_OPERATE_ERROR(8040, "ES操作失败"),
    HTTP_REQ_ERROR(8050, "第三方http请求异常"),


    ;

    private final int code;

    private final String message;

    ResultStatus(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
