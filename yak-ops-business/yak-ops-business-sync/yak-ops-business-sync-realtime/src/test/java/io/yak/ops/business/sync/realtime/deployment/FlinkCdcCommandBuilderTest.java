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

class FlinkCdcCommandBuilderTest {

  @Test
  void buildsYarnApplicationCommandWithoutShellConcatenation() {
    FlinkCdcVersionPO version = new FlinkCdcVersionPO();
    version.setCdcHome("/opt/flink-cdc-3.5.0");
    RealtimeEnvironmentPO environment = new RealtimeEnvironmentPO();
    environment.setDeploymentMode(DeploymentMode.YARN_APPLICATION.name());
    environment.setFlinkHome("/opt/flink-1.20");
    FlinkCdcSubmission submission = new FlinkCdcSubmission(
        new RealtimeJobPO(),
        environment,
        version,
        new RealtimeDeploymentPO(),
        Map.of("flink.execution.checkpointing.interval", "2min", "env.HADOOP_CONF_DIR", "/etc/hadoop"),
        Map.of("parallelism.default", "4"),
        "hdfs:///savepoint-1",
        Path.of("/tmp"));

    assertThat(FlinkCdcCommandBuilder.submitCommand(submission, Path.of("/tmp/pipeline.yaml")))
        .containsExactly(
            "/opt/flink-cdc-3.5.0/bin/flink-cdc.sh",
            "-t",
            "yarn-application",
            "-s",
            "hdfs:///savepoint-1",
            "-Dexecution.checkpointing.interval=2min",
            "-Dparallelism.default=4",
            "/tmp/pipeline.yaml");
    assertThat(FlinkCdcCommandBuilder.processEnvironment(submission))
        .containsEntry("FLINK_HOME", "/opt/flink-1.20")
        .containsEntry("HADOOP_CONF_DIR", "/etc/hadoop");
  }
}
