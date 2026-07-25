package io.yak.ops.infrastructure.engine;

import io.yak.ops.domain.job.CreateJobExecutionService;
import io.yak.ops.domain.job.JobExecutionRepository;
import io.yak.ops.domain.job.UpdateJobExecutionStatusService;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JobExecutionConfiguration {
    @Bean Clock jobExecutionClock() { return Clock.systemUTC(); }
    @Bean CreateJobExecutionService createJobExecutionService(JobExecutionRepository repository, Clock jobExecutionClock) { return new CreateJobExecutionService(repository, jobExecutionClock); }
    @Bean UpdateJobExecutionStatusService updateJobExecutionStatusService(JobExecutionRepository repository, Clock jobExecutionClock) { return new UpdateJobExecutionStatusService(repository, jobExecutionClock); }
}
