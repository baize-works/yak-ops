package io.yak.ops.business.sync.realtime.deployment;

import io.yak.ops.business.sync.realtime.model.enums.DeploymentMode;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 构造 Flink CDC CLI 命令，不经由 shell 执行。 */
public final class FlinkCdcCommandBuilder {

  private FlinkCdcCommandBuilder() {
  }

  public static List<String> submitCommand(FlinkCdcSubmission submission, Path pipelineFile) {
    Path script = Path.of(submission.getCdcVersion().getCdcHome(), "bin", "flink-cdc.sh");
    List<String> command = new ArrayList<>();
    command.add(script.toString());
    if (DeploymentMode.YARN_APPLICATION.name()
        .equals(submission.getEnvironment().getDeploymentMode())) {
      command.add("-t");
      command.add("yarn-application");
    }
    if (submission.getSavepointPath() != null && !submission.getSavepointPath().isBlank()) {
      command.add("-s");
      command.add(submission.getSavepointPath().trim());
    }
    mergedRuntimeOptions(submission).entrySet().stream()
        .sorted(Comparator.comparing(Map.Entry::getKey))
        .forEach(entry -> command.add("-D" + entry.getKey() + "=" + entry.getValue()));
    command.add(pipelineFile.toString());
    return List.copyOf(command);
  }

  public static Map<String, String> processEnvironment(FlinkCdcSubmission submission) {
    Map<String, String> environment = new LinkedHashMap<>();
    if (submission.getEnvironment().getFlinkHome() != null) {
      environment.put("FLINK_HOME", submission.getEnvironment().getFlinkHome());
    }
    submission.getDeploymentConfig().forEach((key, value) -> {
      if (key.startsWith("env.") && key.length() > 4) {
        environment.put(key.substring(4), value);
      }
    });
    return environment;
  }

  private static Map<String, String> mergedRuntimeOptions(FlinkCdcSubmission submission) {
    Map<String, String> merged = new LinkedHashMap<>();
    DeploymentMode mode = DeploymentMode.valueOf(submission.getEnvironment().getDeploymentMode());
    if (mode == DeploymentMode.YARN_SESSION) {
      merged.put("execution.target", "yarn-session");
      putIfPresent(merged, "yarn.application.id", submission.getEnvironment().getClusterId());
    } else if (mode == DeploymentMode.KUBERNETES_SESSION) {
      merged.put("execution.target", "kubernetes-session");
      putIfPresent(merged, "kubernetes.cluster-id", submission.getEnvironment().getClusterId());
      putIfPresent(merged, "kubernetes.namespace", submission.getEnvironment().getNamespace());
    }
    submission.getDeploymentConfig().forEach((key, value) -> {
      if (key.startsWith("flink.") && key.length() > 6) {
        merged.put(key.substring(6), value);
      }
    });
    merged.putAll(submission.getRuntimeOptions());
    return merged;
  }

  private static void putIfPresent(Map<String, String> values, String key, String value) {
    if (value != null && !value.isBlank()) {
      values.put(key, value.trim());
    }
  }
}
