package io.yak.ops.application.support.builder.env;

import io.yak.ops.web.contract.dto.config.JobEnvConfig;

import java.util.Map;

public interface EnvConfigExtender {

    boolean supports(JobEnvConfig envConfig);

    void fill(Map<String, Object> envMap, JobEnvConfig envConfig);
}
