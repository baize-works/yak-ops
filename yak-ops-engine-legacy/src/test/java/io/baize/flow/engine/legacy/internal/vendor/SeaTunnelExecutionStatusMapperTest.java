package io.baize.flow.engine.legacy.internal.vendor;
import static org.junit.jupiter.api.Assertions.assertEquals;
import io.baize.flow.engine.api.JobExecutionStatus;
import org.junit.jupiter.api.Test;
class SeaTunnelExecutionStatusMapperTest {
 @Test void mapsVendorLifecycleOnlyInsideAdapter() {
  assertEquals(JobExecutionStatus.RUNNING, SeaTunnelExecutionStatusMapper.map("RUNNING"));
  assertEquals(JobExecutionStatus.SUCCEEDED, SeaTunnelExecutionStatusMapper.map("FINISHED"));
  assertEquals(JobExecutionStatus.CANCELED, SeaTunnelExecutionStatusMapper.map("CANCELLED"));
  assertEquals(JobExecutionStatus.UNKNOWN, SeaTunnelExecutionStatusMapper.map("NEW_VENDOR_STATE"));
 }
}
