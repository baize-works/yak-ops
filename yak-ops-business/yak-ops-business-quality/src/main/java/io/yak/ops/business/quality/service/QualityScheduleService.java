package io.yak.ops.business.quality.service;

import io.yak.ops.business.quality.api.QualityScheduleApi.ScheduleRule;
import io.yak.ops.business.quality.repository.QualityScheduleRepository;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class QualityScheduleService {

  private final QualityScheduleRepository repository;

  public QualityScheduleService(QualityScheduleRepository repository) {
    this.repository = repository;
  }

  @Transactional(
      readOnly = true,
      transactionManager = "qualityTransactionManager")
  public List<ScheduleRule> findAllSchedules() {
    return repository.findAllSchedules();
  }
}
