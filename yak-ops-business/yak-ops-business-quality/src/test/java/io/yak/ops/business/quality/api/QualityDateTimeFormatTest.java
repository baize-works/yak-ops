package io.yak.ops.business.quality.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.lang.reflect.RecordComponent;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

class QualityDateTimeFormatTest {

  private final ObjectMapper objectMapper = new ObjectMapper()
      .registerModule(new JavaTimeModule());

  @Test
  void serializesTimestampToSecondPrecisionWithSpaceSeparator() throws Exception {
    QualityWorkspaceApi.WorkspaceStats stats = new QualityWorkspaceApi.WorkspaceStats(
        3,
        2,
        8,
        1,
        LocalDateTime.of(2026, 8, 6, 18, 20, 6, 653_000_000));

    String actual = objectMapper
        .readTree(objectMapper.writeValueAsString(stats))
        .get("latestExecutionTime")
        .asText();

    assertThat(actual).isEqualTo("2026-08-06 18:20:06");
  }

  @Test
  void everyQualityResponseTimestampUsesTheSharedFormat() {
    RecordComponent[] timestampComponents = Stream.concat(
            Arrays.stream(QualityApi.class.getDeclaredClasses()),
            Arrays.stream(QualityWorkspaceApi.class.getDeclaredClasses()))
        .filter(Class::isRecord)
        .flatMap(type -> Arrays.stream(type.getRecordComponents()))
        .filter(component -> component.getType() == LocalDateTime.class)
        .toArray(RecordComponent[]::new);

    assertThat(timestampComponents)
        .isNotEmpty()
        .allSatisfy(component -> assertThat(
            component.isAnnotationPresent(QualityDateTimeFormat.class))
            .as("%s.%s should declare @QualityDateTimeFormat",
                component.getDeclaringRecord().getSimpleName(),
                component.getName())
            .isTrue());
  }
}
