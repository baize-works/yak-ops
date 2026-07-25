package io.yak.ops.web.contract.dto.config;

import lombok.Data;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class CheckpointConfig {

    /**
     * 是否开启 checkpoint
     */
    private Boolean enabled;

    /**
     * checkpoint 间隔，单位秒
     */
    private Integer intervalSeconds;

    /**
     * checkpoint 超时时间，单位秒
     */
    private Integer timeoutSeconds;

    /**
     * 两次 checkpoint 之间的最小暂停时间，单位秒
     */
    private Integer minPauseSeconds;

    /**
     * 最大并发 checkpoint 数
     */
    private Integer maxConcurrentCheckpoints;

    /**
     * checkpoint 失败容忍次数
     */
    private Integer tolerableFailureNumber;

    /**
     * EXACTLY_ONCE / AT_LEAST_ONCE
     */
    private String checkpointMode;

    /**
     * checkpoint 存储路径
     */
    private String storagePath;
}
