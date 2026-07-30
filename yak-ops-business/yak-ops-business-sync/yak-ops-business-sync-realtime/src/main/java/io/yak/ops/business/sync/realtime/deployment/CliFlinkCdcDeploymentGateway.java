package io.yak.ops.business.sync.realtime.deployment;

import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.config.RealtimeSyncProperties;
import io.yak.ops.business.sync.realtime.model.enums.DeploymentMode;
import io.yak.ops.business.sync.realtime.model.enums.DeploymentState;
import io.yak.ops.business.sync.realtime.model.response.DeploymentResult;
import io.yak.ops.business.sync.realtime.model.response.DeploymentStatus;
import io.yak.ops.business.sync.realtime.model.response.SavepointResult;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** Standalone、YARN 和 Kubernetes Session 的 CLI 部署适配器。 */
@ConditionalOnRealtimeSyncEnabled
@Component
public class CliFlinkCdcDeploymentGateway implements FlinkCdcDeploymentGateway {

  private static final Pattern EXTERNAL_ID = Pattern.compile(
      "(?im)^(?:Job ID|Application ID):\\s*([A-Za-z0-9_-]+)\\s*$");

  private final CommandExecutor commandExecutor;
  private final FlinkRestClient restClient;
  private final RealtimeSyncProperties properties;

  public CliFlinkCdcDeploymentGateway(
      CommandExecutor commandExecutor,
      FlinkRestClient restClient,
      RealtimeSyncProperties properties) {
    this.commandExecutor = commandExecutor;
    this.restClient = restClient;
    this.properties = properties;
  }

  @Override
  public boolean supports(DeploymentMode mode) {
    return !mode.isOperator();
  }

  @Override
  public DeploymentResult submit(FlinkCdcSubmission submission) {
    try {
      Path directory = deploymentDirectory(submission);
      Path pipelineFile = directory.resolve("pipeline.yaml");
      Files.writeString(pipelineFile, submission.job().getPipelineYaml(), StandardCharsets.UTF_8);
      DeploymentFileSecurity.ownerReadWrite(pipelineFile);
      List<String> command = FlinkCdcCommandBuilder.submitCommand(submission, pipelineFile);
      CommandResult result = commandExecutor.execute(
          command, FlinkCdcCommandBuilder.processEnvironment(submission), directory);
      return new DeploymentResult(
          parseExternalId(result.output()), command, null, result.output());
    } catch (Exception exception) {
      if (exception instanceof IllegalStateException stateException) {
        throw stateException;
      }
      throw new IllegalStateException("Flink CDC CLI 提交失败：" + exception.getMessage(), exception);
    }
  }

  @Override
  public void cancel(FlinkCdcSubmission submission) {
    String externalId = requireExternalId(submission);
    List<String> command = new ArrayList<>();
    if (DeploymentMode.YARN_APPLICATION.name()
        .equals(submission.environment().getDeploymentMode())) {
      command.add(properties.getYarnCommand());
      command.add("application");
      command.add("-kill");
      command.add(externalId);
    } else {
      command.add(Path.of(submission.environment().getFlinkHome(), "bin", "flink").toString());
      command.add("cancel");
      command.add(externalId);
    }
    commandExecutor.execute(
        command, FlinkCdcCommandBuilder.processEnvironment(submission), submission.workDirectory());
  }

  @Override
  public DeploymentStatus status(FlinkCdcSubmission submission) {
    String externalId = requireExternalId(submission);
    if (submission.environment().getRestAddress() == null
        || submission.environment().getRestAddress().isBlank()
        || !externalId.matches("[0-9a-fA-F]{32}")) {
      return new DeploymentStatus(
          DeploymentState.UNKNOWN,
          "UNKNOWN",
          "当前部署未配置可用于查询的 Flink REST 地址或外部标识不是 Flink Job ID");
    }
    return restClient.status(submission.environment().getRestAddress(), externalId);
  }

  @Override
  public SavepointResult triggerSavepoint(
      FlinkCdcSubmission submission, String targetDirectory) {
    return restClient.triggerSavepoint(
        submission.environment().getRestAddress(),
        requireExternalId(submission),
        targetDirectory);
  }

  private Path deploymentDirectory(FlinkCdcSubmission submission) throws Exception {
    Path directory = properties.getWorkDirectory()
        .resolve("job-" + submission.job().getId())
        .resolve("deployment-" + submission.deployment().getId());
    Files.createDirectories(directory);
    return directory;
  }

  private static String parseExternalId(String output) {
    Matcher matcher = EXTERNAL_ID.matcher(output == null ? "" : output);
    if (!matcher.find()) {
      throw new IllegalStateException("提交成功输出中未找到 Job ID 或 Application ID：" + output);
    }
    return matcher.group(1);
  }

  private static String requireExternalId(FlinkCdcSubmission submission) {
    String externalId = submission.deployment().getExternalId();
    if (externalId == null || externalId.isBlank()) {
      throw new IllegalStateException("部署记录缺少外部任务标识");
    }
    return externalId;
  }
}
