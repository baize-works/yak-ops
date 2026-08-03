package io.yak.ops.common.bean.vo.resource;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class ResourceVOJsonTest {

  private static final long SNOWFLAKE_ID = 1_919_789_105_691_844_609L;

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void serializesResourceIdentifiersAsStringsWithoutLosingPrecision() throws Exception {
    ResourceVO resource = ResourceVO.builder()
        .id(SNOWFLAKE_ID)
        .parentId(SNOWFLAKE_ID - 1)
        .fileSize(1024L)
        .build();

    JsonNode json = objectMapper.valueToTree(resource);

    assertThat(json.get("id").isTextual()).isTrue();
    assertThat(json.get("id").textValue()).isEqualTo("1919789105691844609");
    assertThat(json.get("parentId").textValue()).isEqualTo("1919789105691844608");
    assertThat(json.get("fileSize").isIntegralNumber()).isTrue();
  }

  @Test
  void serializesContentResourceIdentifierAsString() {
    ResourceContentVO content = ResourceContentVO.builder()
        .resourceId(SNOWFLAKE_ID)
        .build();

    JsonNode json = objectMapper.valueToTree(content);

    assertThat(json.get("resourceId").isTextual()).isTrue();
    assertThat(json.get("resourceId").textValue()).isEqualTo("1919789105691844609");
  }
}
