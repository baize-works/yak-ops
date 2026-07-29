package io.yak.ops.business.sync.realtime.validation;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.junit.jupiter.api.Test;

class PipelineDefinitionValidatorTest {

  private final PipelineDefinitionValidator validator =
      new PipelineDefinitionValidator(new ObjectMapper(new YAMLFactory()));

  @Test
  void acceptsRequiredPipelineSections() {
    String yaml = """
        source:
          type: mysql
        sink:
          type: doris
        pipeline:
          name: mysql-to-doris
        """;

    assertThat(validator.validate(yaml).valid()).isTrue();
  }

  @Test
  void reportsMissingSections() {
    assertThat(validator.validate("pipeline:\n  name: test").messages())
        .contains("source 必须是对象且不能为空", "sink 必须是对象且不能为空");
  }
}
