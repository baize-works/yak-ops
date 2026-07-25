package io.baize.flow.engine.api;

import java.util.Map;
import java.util.Objects;

/** Complete, engine-neutral request to submit a job to an endpoint. */
public final class JobSubmitCommand {

    private final EngineEndpoint endpoint;
    private final String definition;
    private final Map<String, String> runtimeParameters;
    private final String idempotencyKey;

    public JobSubmitCommand(EngineEndpoint endpoint, String definition, Map<String, String> runtimeParameters, String idempotencyKey) {
        Objects.requireNonNull(endpoint, "endpoint");
        Objects.requireNonNull(definition, "definition");
        runtimeParameters = runtimeParameters == null ? java.util.Collections.emptyMap() : java.util.Collections.unmodifiableMap(new java.util.LinkedHashMap<>(runtimeParameters));
        idempotencyKey = Objects.requireNonNull(idempotencyKey, "idempotencyKey").trim();
        if (idempotencyKey.isEmpty()) throw new IllegalArgumentException("idempotencyKey must not be blank");
        this.endpoint = endpoint;
        this.definition = definition;
        this.runtimeParameters = runtimeParameters;
        this.idempotencyKey = idempotencyKey;
    }

    public EngineEndpoint endpoint() { return endpoint; }


    public EngineEndpoint getEndpoint() { return endpoint; }

    public String definition() { return definition; }


    public String getDefinition() { return definition; }

    public Map<String, String> runtimeParameters() { return runtimeParameters; }


    public Map<String, String> getRuntimeParameters() { return runtimeParameters; }

    public String idempotencyKey() { return idempotencyKey; }


    public String getIdempotencyKey() { return idempotencyKey; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        JobSubmitCommand that = (JobSubmitCommand) o;
        return java.util.Objects.equals(endpoint, that.endpoint) && java.util.Objects.equals(definition, that.definition) && java.util.Objects.equals(runtimeParameters, that.runtimeParameters) && java.util.Objects.equals(idempotencyKey, that.idempotencyKey);
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(endpoint, definition, runtimeParameters, idempotencyKey); }

    @Override
    public String toString() {
        return "JobSubmitCommand[" + "endpoint=" + endpoint + ", " + "definition=" + definition + ", " + "runtimeParameters=" + runtimeParameters + ", " + "idempotencyKey=" + idempotencyKey + "]";
    }
}
