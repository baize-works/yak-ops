package io.yak.ops.business.job.task;

/** 工作流可引用的最小任务定义。 */
public record TaskDefinition(
    String id,
    String name,
    String type) {}
