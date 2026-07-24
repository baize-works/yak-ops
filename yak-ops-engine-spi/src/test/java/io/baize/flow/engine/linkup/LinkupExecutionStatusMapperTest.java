package io.baize.flow.engine.linkup;
import static org.junit.jupiter.api.Assertions.assertEquals;
import io.baize.flow.domain.job.JobExecutionStatus;
import org.junit.jupiter.api.Test;
class LinkupExecutionStatusMapperTest { @Test void maps_linkup_lifecycle() { assertEquals(JobExecutionStatus.CANCELLING, LinkupExecutionStatusMapper.map("canceling")); assertEquals(JobExecutionStatus.UNKNOWN, LinkupExecutionStatusMapper.map("gone")); } }
