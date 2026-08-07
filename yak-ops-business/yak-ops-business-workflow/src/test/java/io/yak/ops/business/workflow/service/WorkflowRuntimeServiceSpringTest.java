package io.yak.ops.business.workflow.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class WorkflowRuntimeServiceSpringTest {

  @Test
  void shouldCreateRuntimeServiceThroughSpring() {
    try (AnnotationConfigApplicationContext context =
        new AnnotationConfigApplicationContext()) {
      context.register(WorkflowEventStreamService.class, WorkflowRuntimeService.class);
      context.refresh();

      assertThat(context.getBean(WorkflowRuntimeService.class)).isNotNull();
    }
  }
}
