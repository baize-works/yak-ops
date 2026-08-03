package io.yak.ops.business.job.schedule;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Yak Ops 业务调度基础配置。
 */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@EnableConfigurationProperties(JobScheduleProperties.class)
public class JobScheduleConfiguration {
}
