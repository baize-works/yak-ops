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
import org.springframework.stereotype.Component;

/** Kubernetes Flink Operator 部署适配器。 */
@ConditionalOnRealtimeSyncEnabled
@Component
public class KubernetesOperatorDeploymentGateway implements FlinkCdcDeploymentGateway {

  private final CommandExecutor commandExecutor;
  private final RealtimeSyncProperties properties;

  public KubernetesOperatorDeploymentGateway(
      CommandExecutor commandExecutor, RealtimeSyncProperties properties) {
    this.commandExecutor = commandExecutor;
    this.properties = properties;
  }

  @Override
  public boolean supports(DeploymentMode mode) {
    return mode.isOperator();
  }

  @Override
  public DeploymentResult submit(FlinkCdcSubmission submission) {
    try {
      Path directory = properties.getWorkDirectory()
          .resolve("job-" + submission.job().getId())
          .resolve("deployment-" + submission.deployment().getId());
      Files.createDirectories(directory);
      Path manifest = directory.resolve("flink-deployment.yaml");
      Files.writeString(
          manifest, KubernetesManifestBuilder.build(submission), StandardCharsets.UTF_8);
      DeploymentFileSecurity.ownerReadWrite(manifest);
      List<String> command = kubectl(submission, "apply", "-f", manifest.toString());
      CommandResult result = commandExecutor.execute(command, null, directory);
      return new DeploymentResult(
          KubernetesManifestBuilder.resourceName(submission),
          command,
          manifest.toString(),
          result.output());
    } catch (Exception exception) {
      if (exception instanceof IllegalStateException stateException) {
        throw stateException;
      }
      throw new IllegalStateException("Kubernetes Operator 提交失败：" + exception.getMessage(), exception);
    }
  }

  @Override
  public void cancel(FlinkCdcSubmission submission) {
    String manifest = submission.deployment().getManifestPath();
    if (manifest == null || manifest.isBlank()) {
      throw new IllegalStateException("部署记录缺少 Kubernetes 清单路径");
    }
    commandExecutor.execute(kubectl(submission, "delete", "-f", manifest), null, submission.workDirectory());
  }

  @Override
  public DeploymentStatus status(FlinkCdcSubmission submission) {
    List<String> command = kubectl(
        submission,
        "get",
        "flinkdeployment",
        requireExternalId(submission),
        "-o",
        "jsonpath={.status.jobStatus.state}");
    CommandResult result = commandExecutor.execute(command, null, submission.workDirectory());
    String raw = result.output().isBlank() ? "UNKNOWN" : result.output().trim();
    DeploymentState state = switch (raw.toUpperCase()) {
      case "RUNNING", "RECONCILING", "DEPLOYING" -> DeploymentState.RUNNING;
      case "CANCELED", "CANCELLED" -> DeploymentState.CANCELLED;
      case "FINISHED" -> DeploymentState.FINISHED;
      case "FAILED", "ERROR" -> DeploymentState.FAILED;
      default -> DeploymentState.UNKNOWN;
    };
    return new DeploymentStatus(state, raw, result.output());
  }

  @Override
  public SavepointResult triggerSavepoint(
      FlinkCdcSubmission submission, String targetDirectory) {
    String nonce = String.valueOf(System.currentTimeMillis());
    String patch = "{\"spec\":{\"job\":{\"savepointTriggerNonce\":" + nonce + "}}}";
    List<String> command = kubectl(
        submission,
        "patch",
        "flinkdeployment",
        requireExternalId(submission),
        "--type",
        "merge",
        "-p",
        patch);
    CommandResult result = commandExecutor.execute(command, null, submission.workDirectory());
    return new SavepointResult(nonce, targetDirectory, result.output());
  }

  private List<String> kubectl(FlinkCdcSubmission submission, String... arguments) {
    List<String> command = new ArrayList<>();
    command.add(properties.getKubectlCommand());
    String kubeConfig = submission.deploymentConfig().get("kubeConfig");
    if (kubeConfig != null && !kubeConfig.isBlank()) {
      command.add("--kubeconfig");
      command.add(kubeConfig);
    }
    command.add("-n");
    command.add(submission.environment().getNamespace());
    command.addAll(List.of(arguments));
    return List.copyOf(command);
  }

  private static String requireExternalId(FlinkCdcSubmission submission) {
    String externalId = submission.deployment().getExternalId();
    if (externalId == null || externalId.isBlank()) {
      throw new IllegalStateException("部署记录缺少 Kubernetes 资源名称");
    }
    return externalId;
  }
}
