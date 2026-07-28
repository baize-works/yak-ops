package io.yak.ops.business.workflow.util;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.common.bean.entity.workflow.WorkflowDag;
import io.yak.ops.common.bean.entity.workflow.WorkflowNode;
import io.yak.ops.common.bean.entity.workflow.WorkflowViewport;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class WorkflowJsonCodecTest {

  private final WorkflowJsonCodec codec = new WorkflowJsonCodec(new ObjectMapper());

  @Test
  void shouldRoundTripDesignerMetadata() {
    WorkflowNode node = new WorkflowNode(
        "start",
        "开始",
        "NOOP",
        Map.of(),
        0,
        0,
        0,
        true,
        true,
        true);
    node.setDescription("工作流入口节点");
    node.setPositionX(120D);
    node.setPositionY(240D);

    WorkflowDag dag = new WorkflowDag(List.of(node), List.of());
    dag.setViewport(new WorkflowViewport(20D, 40D, 0.8D));

    WorkflowDag restored = codec.readDag(codec.write(dag));

    assertThat(restored.getNodes()).hasSize(1);
    assertThat(restored.getNodes().get(0).getDescription()).isEqualTo("工作流入口节点");
    assertThat(restored.getNodes().get(0).getPositionX()).isEqualTo(120D);
    assertThat(restored.getNodes().get(0).getPositionY()).isEqualTo(240D);
    assertThat(restored.getViewport().getX()).isEqualTo(20D);
    assertThat(restored.getViewport().getY()).isEqualTo(40D);
    assertThat(restored.getViewport().getZoom()).isEqualTo(0.8D);
  }
}
