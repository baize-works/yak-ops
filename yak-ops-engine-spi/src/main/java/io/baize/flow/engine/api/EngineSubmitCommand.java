package io.baize.flow.engine.api;

import java.util.Objects;

public record EngineSubmitCommand(String config, String fileName, String jobName) {
    public EngineSubmitCommand { Objects.requireNonNull(config, "config"); }
}
