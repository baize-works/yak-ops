package io.yak.ops.engine.legacy.internal.vendor;
import static org.junit.jupiter.api.Assertions.assertEquals;
import io.yak.ops.engine.api.JobExecutionStatus;
import org.junit.jupiter.api.Test;
class SeaTunnelExecutionStatusMapperTest {
 @Test void mapsVendorLifecycleOnlyInsideAdapter() {
  assertEquals(JobExecutionStatus.RUNNING, SeaTunnelExecutionStatusMapper.map("RUNNING"));
  assertEquals(JobExecutionStatus.SUCCEEDED, SeaTunnelExecutionStatusMapper.map("FINISHED"));
  assertEquals(JobExecutionStatus.CANCELED, SeaTunnelExecutionStatusMapper.map("CANCELLED"));
 assertEquals(JobExecutionStatus.UNKNOWN, SeaTunnelExecutionStatusMapper.map("NEW_VENDOR_STATE"));
 }
 @Test void preservesUnknownWireValueWithoutInferringOutcome() {
  SeaTunnelExecutionStatusMapper.StatusResolution result =
          SeaTunnelExecutionStatusMapper.resolve(" New_Vendor_State ");
  assertEquals(JobExecutionStatus.UNKNOWN, result.status());
  assertEquals(" New_Vendor_State ", result.rawStatus());
 }
}
