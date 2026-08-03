package io.yak.ops.business.job.schedule;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 统一驱动各业务调度注册器。
 *
 * <p>启动时执行一次，并周期性对账，保证数据库计划与实际调度引擎状态一致。</p>
 */
@Component
@ConditionalOnProperty(
    prefix = "yak.job.schedule",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
public class JobScheduleRegistrationCoordinator implements ApplicationRunner {

  private static final Logger LOG =
      LoggerFactory.getLogger(JobScheduleRegistrationCoordinator.class);

  private final List<JobScheduleRegistrar> registrars;

  public JobScheduleRegistrationCoordinator(List<JobScheduleRegistrar> registrars) {
    List<JobScheduleRegistrar> ordered = new ArrayList<>(registrars);
    ordered.sort(Comparator.comparing(JobScheduleRegistrar::registrationType));
    this.registrars = List.copyOf(ordered);
  }

  @Override
  public void run(ApplicationArguments args) {
    synchronize();
  }

  @Scheduled(
      initialDelayString = "${yak.job.schedule.initial-delay-millis:2000}",
      fixedDelayString = "${yak.job.schedule.fixed-delay-millis:5000}")
  public void synchronize() {
    for (JobScheduleRegistrar registrar : registrars) {
      try {
        registrar.synchronize();
      } catch (RuntimeException exception) {
        LOG.warn(
            "Business schedule registration failed, type={}",
            registrar.registrationType(),
            exception);
      }
    }
  }
}
