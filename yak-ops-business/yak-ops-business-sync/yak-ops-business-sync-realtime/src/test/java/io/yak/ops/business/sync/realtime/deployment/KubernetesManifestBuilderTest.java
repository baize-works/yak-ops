package io.yak.ops.business.sync.realtime.deployment;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.business.sync.realtime.model.enums.DeploymentMode;
import io.yak.ops.business.sync.realtime.model.po.FlinkCdcVersionPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeDeploymentPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeEnvironmentPO;
import io.yak.ops.business.sync.realtime.model.po.RealtimeJobPO;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;

class KubernetesManifestBuilderTest {

  @Test
  void createsConfigMapAndFlinkDeployment() {
    RealtimeJobPO job = new RealtimeJobPO();
    job.setName("MySQL To Doris");
    job.setPipelineYaml("source:\n  type: mysql\nsink:\n  type: doris\npipeline:\n  name: demo");
    RealtimeEnvironmentPO environment = new RealtimeEnvironmentPO();
    environment.setDeploymentMode(DeploymentMode.KUBERNETES_OPERATOR.name());
    environment.setNamespace("data-platform");
    FlinkCdcVersionPO version = new FlinkCdcVersionPO();
    version.setVersion("3.5.0");
    RealtimeDeploymentPO deployment = new RealtimeDeploymentPO();
    deployment.setId(12L);
    FlinkCdcSubmission submission = new FlinkCdcSubmission(
        job,
        environment,
        version,
        deployment,
        Map.of("image", "registry/flink-cdc:3.5.0", "flinkVersion", "v1_20"),
        Map.of(),
        null,
        Path.of("/tmp"));

    String manifest = KubernetesManifestBuilder.build(submission);

    assertThat(manifest)
        .contains("kind: ConfigMap")
        .contains("kind: FlinkDeployment")
        .contains("name: mysql-to-doris-12")
        .contains("entryClass: org.apache.flink.cdc.cli.CliFrontend")
        .contains("--use-mini-cluster");
  }
}
