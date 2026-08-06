package io.yak.ops.business.quality.service;

import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.api.QualityApi.TemplateListView;
import io.yak.ops.business.quality.api.QualityApi.TemplateQuery;
import io.yak.ops.business.quality.api.QualityApi.TemplateSummary;
import io.yak.ops.business.quality.api.QualityApi.TemplateView;
import io.yak.ops.business.quality.repository.QualityRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@ConditionalOnQualityEnabled
@Service
public class QualityTemplateService {

  private final QualityRepository repository;

  public QualityTemplateService(QualityRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public TemplateListView list(TemplateQuery query) {
    TemplateQuery normalized = query == null
        ? new TemplateQuery(null, null, null)
        : query;
    List<TemplateView> all = repository.listTemplates(new TemplateQuery(null, null, null));
    Map<String, Long> dimensions = new LinkedHashMap<>();
    for (TemplateView template : all) {
      dimensions.merge(template.dimension(), 1L, Long::sum);
    }
    return new TemplateListView(
        repository.listTemplates(normalized),
        new TemplateSummary(all.size(), dimensions));
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public TemplateView get(long id) {
    return repository.findTemplate(id)
        .orElseThrow(() -> new IllegalArgumentException("规则模板不存在：" + id));
  }
}
