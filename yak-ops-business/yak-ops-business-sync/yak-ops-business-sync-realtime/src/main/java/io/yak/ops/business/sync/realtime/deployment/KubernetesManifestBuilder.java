package io.yak.ops.business.sync.realtime.deployment;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/** 生成 Kubernetes Operator 所需的 ConfigMap 与 FlinkDeployment。 */
public final class KubernetesManifestBuilder {

  private KubernetesManifestBuilder() {
  }

  public static String resourceName(FlinkCdcSubmission submission) {
    String normalized = submission.job().getName().toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9-]", "-")
        .replaceAll("-+", "-")
        .replaceAll("^-|-$", "");
    if (normalized.isBlank()) {
      normalized = "realtime-job";
    }
    normalized = normalized.length() > 40 ? normalized.substring(0, 40) : normalized;
    normalized = normalized.replaceAll("-+$", "");
    return normalized + "-" + submission.deployment().getId();
  }

  public static String build(FlinkCdcSubmission submission) {
    Map<String, String> config = submission.deploymentConfig();
    String name = resourceName(submission);
    String namespace = required(submission.environment().getNamespace(), "namespace");
    String image = required(config.get("image"), "image");
    String flinkVersion = required(config.get("flinkVersion"), "flinkVersion");
    String serviceAccount = config.getOrDefault("serviceAccount", "flink");
    String imagePullPolicy = config.getOrDefault("imagePullPolicy", "IfNotPresent");
    String upgradeMode = config.getOrDefault("upgradeMode", "savepoint");
    String jobManagerMemory = config.getOrDefault("jobManagerMemory", "1024m");
    String taskManagerMemory = config.getOrDefault("taskManagerMemory", "1024m");
    String parallelism = config.getOrDefault("parallelism", "1");
    String cdcHome = config.getOrDefault(
        "cdcHome", "/opt/flink/flink-cdc-" + submission.cdcVersion().getVersion());
    String pipelinePath = cdcHome + "/conf/pipeline.yaml";
    String jarUri = "local://" + cdcHome + "/lib/flink-cdc-dist-"
        + submission.cdcVersion().getVersion() + ".jar";
    String flinkConfiguration = flinkConfiguration(submission);

    return """
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: %s-pipeline
          namespace: %s
        data:
          pipeline.yaml: |-
        %s
        ---
        apiVersion: flink.apache.org/v1beta1
        kind: FlinkDeployment
        metadata:
          name: %s
          namespace: %s
        spec:
          image: '%s'
          imagePullPolicy: %s
          flinkVersion: %s
          flinkConfiguration:
        %s
          serviceAccount: %s
          jobManager:
            replicas: 1
            resource:
              cpu: 1
              memory: %s
          taskManager:
            resource:
              cpu: 1
              memory: %s
          podTemplate:
            apiVersion: v1
            kind: Pod
            spec:
              containers:
                - name: flink-main-container
                  volumeMounts:
                    - name: pipeline-config
                      mountPath: %s/conf
              volumes:
                - name: pipeline-config
                  configMap:
                    name: %s-pipeline
          job:
            jarURI: '%s'
            entryClass: org.apache.flink.cdc.cli.CliFrontend
            args:
              - '--use-mini-cluster'
              - '%s'
            parallelism: %s
            upgradeMode: %s
            state: running
        """.formatted(
        name,
        namespace,
        indent(submission.job().getPipelineYaml(), 4),
        name,
        namespace,
        image,
        imagePullPolicy,
        flinkVersion,
        flinkConfiguration,
        serviceAccount,
        jobManagerMemory,
        taskManagerMemory,
        cdcHome,
        name,
        jarUri,
        pipelinePath,
        parallelism,
        upgradeMode);
  }


  private static String flinkConfiguration(FlinkCdcSubmission submission) {
    Map<String, String> values = new LinkedHashMap<>();
    values.put("classloader.resolve-order", "parent-first");
    submission.deploymentConfig().forEach((key, value) -> {
      if (key.startsWith("flink.") && key.length() > 6) {
        values.put(key.substring(6), value);
      }
    });
    values.putAll(submission.runtimeOptions());
    return values.entrySet().stream()
        .sorted(Map.Entry.comparingByKey())
        .map(entry -> "    " + entry.getKey() + ": '" + yamlScalar(entry.getValue()) + "'")
        .collect(Collectors.joining(System.lineSeparator()));
  }

  private static String yamlScalar(String value) {
    return value == null ? "" : value.replace("'", "''");
  }

  private static String indent(String value, int spaces) {
    String prefix = " ".repeat(spaces);
    return value.lines()
        .map(line -> prefix + line)
        .reduce((left, right) -> left + System.lineSeparator() + right)
        .orElse(prefix);
  }

  private static String required(String value, String field) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException("Kubernetes Operator 部署配置缺少 " + field);
    }
    return value.trim();
  }
}
