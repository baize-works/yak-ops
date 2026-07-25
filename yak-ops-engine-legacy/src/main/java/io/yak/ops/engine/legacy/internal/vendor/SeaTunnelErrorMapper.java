package io.yak.ops.engine.legacy.internal.vendor;

import io.yak.ops.engine.api.EngineSubmissionException;
import io.yak.ops.engine.api.EngineUnavailableException;
import java.util.Map;

final class SeaTunnelErrorMapper {
    private SeaTunnelErrorMapper() { }
    static EngineUnavailableException unavailable(String operation, Exception cause) {
        return new EngineUnavailableException("Engine " + operation + " failed", cause, diagnostics(cause));
    }
    static EngineSubmissionException submission(Exception cause) {
        return new EngineSubmissionException("Engine submission failed", cause, diagnostics(cause));
    }
    private static Map<String, String> diagnostics(Exception cause) {
        // Never expose a vendor exception type across the boundary; retain its code/name for support.
        return java.util.Collections.unmodifiableMap(new java.util.LinkedHashMap() {{ put("vendor", "seatunnel"); put("vendor.error_code", cause.getClass().getSimpleName()); }});
    }
}
