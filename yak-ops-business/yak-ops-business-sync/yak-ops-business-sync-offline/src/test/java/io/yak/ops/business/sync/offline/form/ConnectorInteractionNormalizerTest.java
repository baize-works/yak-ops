package io.yak.ops.business.sync.offline.form;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class ConnectorInteractionNormalizerTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void shouldNormalizeConditionalVisibilityAndNestedRequiredRule() throws Exception {
    var rules = mapper.readTree("""
        [
          {
            "type":"RULE_WHEN",
            "optionKeys":["primary_keys"],
            "condition":{"optionKey":"write_mode","operator":"EQ","expectedValue":"UPSERT"},
            "nestedRules":[
              {"type":"REQUIRED","optionKeys":["primary_keys"],"nestedRules":[]}
            ]
          },
          {"type":"EXCLUSIVE","optionKeys":["table_path","query"],"nestedRules":[]}
        ]
        """);

    List<ConnectorFormSchema.Interaction> result =
        new ConnectorInteractionNormalizer(mapper).normalize(rules);

    assertThat(result).extracting(ConnectorFormSchema.Interaction::getEffect)
        .containsExactly("VISIBLE", "REQUIRED", "EXCLUSIVE");
    assertThat(result.get(1).getCondition().getOptionKey()).isEqualTo("write_mode");
    assertThat(result.get(1).getCondition().getExpectedValue()).isEqualTo("UPSERT");
  }
}
