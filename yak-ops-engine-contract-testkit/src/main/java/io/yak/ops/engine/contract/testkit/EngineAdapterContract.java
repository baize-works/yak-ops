package io.yak.ops.engine.contract.testkit;

import static org.junit.jupiter.api.Assertions.*;
import io.yak.ops.engine.api.*;
import java.time.Duration;
import org.junit.jupiter.api.Test;

/** Reusable acceptance suite. Every adapter must subclass this and supply an isolated harness. */
public abstract class EngineAdapterContract {
    protected abstract Harness harness();
    public interface Harness {
        EngineGateway gateway(); EngineEndpoint endpoint(); JobSubmitCommand command(String idempotencyKey);
        void vendorStatus(String status); void timeoutQueries(); boolean cancellationObserved();
    }
    @Test void submissionIsIdempotent() {
        Harness h=harness(); JobExecution first=h.gateway().submit(h.command("same-key")); JobExecution second=h.gateway().submit(h.command("same-key"));
        assertEquals(first.externalExecutionId(), second.externalExecutionId(), "adapter must deduplicate the idempotency key");
    }
    @Test void mapsEveryVendorStatusAtAdapterBoundary() {
        Harness h=harness(); String external=h.gateway().submit(h.command("mapping")).externalExecutionId();
        assertStatus(h, external, "RUNNING", JobExecutionStatus.RUNNING); assertStatus(h, external, "FINISHED", JobExecutionStatus.SUCCEEDED);
        assertStatus(h, external, "FAILED", JobExecutionStatus.FAILED); assertStatus(h, external, "CANCELED", JobExecutionStatus.CANCELED);
        assertStatus(h, external, "vendor-new-state", JobExecutionStatus.UNKNOWN);
    }
    @Test void queryTimeoutIsNeutral() {
        Harness h=harness(); String external=h.gateway().submit(h.command("timeout")).externalExecutionId(); h.timeoutQueries();
        assertTimeoutPreemptively(Duration.ofSeconds(2), () -> assertThrows(EngineUnavailableException.class,
                () -> h.gateway().execution(h.endpoint(), "timeout", external)));
    }
    @Test void cancellationAndCapabilitiesObeyContract() {
        Harness h=harness(); String external=h.gateway().submit(h.command("cancel")).externalExecutionId(); h.gateway().cancel(h.endpoint(), external);
        assertTrue(h.cancellationObserved());
        for (EngineCapabilities.Capability capability : EngineCapabilities.Capability.values()) {
            if (!h.gateway().capabilities().supports(capability)) assertThrows(UnsupportedEngineCapabilityException.class,
                    () -> h.gateway().capabilities().require(capability));
        }
    }
    private void assertStatus(Harness h,String external,String vendor,JobExecutionStatus expected){h.vendorStatus(vendor); assertEquals(expected,h.gateway().execution(h.endpoint(),"mapping",external).status());}
}
