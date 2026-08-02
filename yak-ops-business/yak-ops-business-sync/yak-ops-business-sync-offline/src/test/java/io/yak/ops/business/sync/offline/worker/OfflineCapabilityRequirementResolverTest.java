package io.yak.ops.business.sync.offline.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.sync.offline.form.ConnectorSchemaRegistry;
import io.yak.ops.business.sync.offline.form.ConnectorSchemaSnapshot;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class OfflineCapabilityRequirementResolverTest {

  @Test
  void derivesConnectorFingerprintsAndExecutionFeatures() throws Exception {
    ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
    ConnectorSchemaRegistry registry = mock(ConnectorSchemaRegistry.class);
    when(registry.get("jdbc", "SOURCE"))
        .thenReturn(snapshot(mapper, "SOURCE", "sha256:source"));
    when(registry.get("jdbc", "SINK"))
        .thenReturn(snapshot(mapper, "SINK", "sha256:sink"));
    OfflineCapabilityRequirementResolver resolver =
        new OfflineCapabilityRequirementResolver(registry, mapper);

    String jobSpec = "{"
        + "\"source\":{\"connectorId\":\"jdbc\",\"options\":{"
        + "\"table_list\":[{\"table_path\":\"orders\"}],"
        + "\"partition_column\":\"id\"}},"
        + "\"sink\":{\"connectorId\":\"jdbc\",\"options\":{"
        + "\"write_mode\":\"UPSERT\","
        + "\"schema_save_mode\":\"CREATE_SCHEMA_WHEN_NOT_EXIST\","
        + "\"dirty_data_policy\":\"SKIP\"}}}";

    JsonNode requirements = mapper.readTree(resolver.resolve(jobSpec));

    assertThat(requirements.path("endpoints").get(0).path("schemaFingerprint").asText())
        .isEqualTo("sha256:source");
    assertThat(requirements.path("endpoints").get(0).path("capabilities").toString())
        .contains("MULTI_TABLE")
        .contains("PARTITION_SPLIT");
    assertThat(requirements.path("endpoints").get(1).path("schemaFingerprint").asText())
        .isEqualTo("sha256:sink");
    assertThat(requirements.path("endpoints").get(1).path("capabilities").toString())
        .contains("UPSERT")
        .contains("AUTO_CREATE_TABLE")
        .contains("DIRTY_DATA_HANDLING");
  }

  private ConnectorSchemaSnapshot snapshot(
      ObjectMapper mapper,
      String role,
      String fingerprint) throws Exception {
    JsonNode schema = mapper.readTree("{"
        + "\"connectorId\":\"jdbc\","
        + "\"role\":\"" + role + "\","
        + "\"schemaVersion\":\"1\","
        + "\"schemaFingerprint\":\"" + fingerprint + "\","
        + "\"options\":[]}");
    return new ConnectorSchemaSnapshot(schema, "CACHE", false, LocalDateTime.now());
  }
}
