package io.yak.ops.business.workflow.common.constant;

/** 工作流模块常量。 */
public final class WorkflowConstant {

  public static final String SYSTEM_OPERATOR = "SYSTEM";
  public static final String QUARTZ_OPERATOR = "QUARTZ";
  public static final String QUARTZ_GROUP = "yak-workflow";
  public static final String QUARTZ_APPLICATION_CONTEXT_KEY = "yakWorkflowApplicationContext";
  public static final String QUARTZ_WORKFLOW_ID_KEY = "workflowId";
  public static final int MAX_PARALLELISM = 256;
  public static final int DEFAULT_INSTANCE_QUERY_LIMIT = 50;
  public static final int MAX_INSTANCE_QUERY_LIMIT = 200;
  public static final int DEFAULT_LOG_QUERY_LIMIT = 2000;
  public static final int MAX_LOG_QUERY_LIMIT = 10000;

  private WorkflowConstant() {
  }
}
