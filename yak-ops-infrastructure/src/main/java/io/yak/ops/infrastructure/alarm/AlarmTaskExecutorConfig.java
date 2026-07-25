package io.yak.ops.infrastructure.alarm;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Bounded executor for alarm delivery so a flood of status changes or a slow
 * webhook cannot exhaust threads.
 */
@Configuration
public class AlarmTaskExecutorConfig {

    @Bean(name = "alarmExecutor")
    public ThreadPoolTaskExecutor alarmExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(512);
        executor.setThreadNamePrefix("alarm-dispatch-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(10);
        executor.initialize();
        return executor;
    }
}
