package io.yak.ops.business.quality.service;

import io.yak.ops.business.quality.api.CustomTemplateApi.*;
import io.yak.ops.business.quality.api.QualityApi.ComparisonOperator;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.repository.CustomTemplateRepository;
import io.yak.ops.business.quality.repository.CustomTemplateRepository.FolderWrite;
import io.yak.ops.business.quality.repository.CustomTemplateRepository.TemplateWrite;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@ConditionalOnQualityEnabled
@Service
public class CustomTemplateService {

  private final CustomTemplateRepository repository;

  public CustomTemplateService(CustomTemplateRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public ListView list(Query query) {
    Query value = query == null ? new Query(null, null, null)
        : new Query(text(query.keyword()), text(query.dimension()), folderId(query.folderId()));
    List<TemplateView> all = repository.listAllCustom();
    List<TemplateView> scope = repository.list(new Query(null, null, value.folderId()));
    Map<String, Long> dimensions = new LinkedHashMap<>();
    scope.forEach(template -> dimensions.merge(template.dimension(), 1L, Long::sum));
    return new ListView(repository.list(value),
        new Summary(scope.size(), repository.countSystem(), all.size(), dimensions));
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public TemplateView get(long id) {
    return repository.find(id)
        .orElseThrow(() -> new IllegalArgumentException("自定义规则模板不存在：" + id));
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public List<FolderView> folders() {
    return repository.listFolders();
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public FolderView createFolder(SaveFolderRequest request, String operator) {
    Long parentId = folderId(request.parentId());
    validateParent(parentId, null);
    uniqueFolder(parentId, request.name().trim(), null);
    return folder(repository.insertFolder(
        new FolderWrite(parentId, request.name().trim(), operator(operator))));
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public FolderView updateFolder(long id, SaveFolderRequest request, String operator) {
    folder(id);
    Long parentId = folderId(request.parentId());
    validateParent(parentId, id);
    uniqueFolder(parentId, request.name().trim(), id);
    if (!repository.updateFolder(id,
        new FolderWrite(parentId, request.name().trim(), operator(operator)))) {
      throw new IllegalArgumentException("规则模板目录不存在：" + id);
    }
    return folder(id);
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public boolean deleteFolder(long id, String operator) {
    FolderView value = folder(id);
    if (value.childCount() > 0) {
      throw new IllegalStateException("当前目录包含子目录，请先删除或移动子目录");
    }
    if (value.templateCount() > 0) {
      throw new IllegalStateException("当前目录包含自定义模板，请先删除或移动模板");
    }
    if (!repository.deleteFolder(id, operator(operator))) {
      throw new IllegalArgumentException("规则模板目录不存在：" + id);
    }
    return true;
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public TemplateView create(SaveTemplateRequest request, String operator) {
    Long folderId = folderId(request.folderId());
    validateFolder(folderId);
    uniqueTemplate(folderId, request.name().trim(), null);
    return get(repository.insertTemplate(
        write(code(), request, folderId, operator(operator))));
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public TemplateView update(long id, SaveTemplateRequest request, String operator) {
    TemplateView existing = get(id);
    Long folderId = folderId(request.folderId());
    validateFolder(folderId);
    uniqueTemplate(folderId, request.name().trim(), id);
    if (!repository.updateTemplate(id,
        write(existing.code(), request, folderId, operator(operator)))) {
      throw new IllegalArgumentException("自定义规则模板不存在：" + id);
    }
    return get(id);
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public TemplateView copy(long id, CopyTemplateRequest request, String operator) {
    TemplateView source = get(id);
    Long folderId = folderId(request.folderId());
    validateFolder(folderId);
    uniqueTemplate(folderId, request.name().trim(), null);
    long copiedId = repository.insertTemplate(new TemplateWrite(
        code(), request.name().trim(), source.description(), source.dimension(),
        source.parameterSchema(), folderId, source.templateSql(), source.setFlag(),
        source.checkType(), source.checkMethod(), operator(operator)));
    return get(copiedId);
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public boolean delete(long id) {
    get(id);
    if (!repository.deleteTemplate(id)) {
      throw new IllegalArgumentException("自定义规则模板不存在：" + id);
    }
    return true;
  }

  private TemplateWrite write(String code, SaveTemplateRequest request,
      Long folderId, String operator) {
    CheckType type = request.checkType() == null
        ? CheckType.NUMERIC : request.checkType();
    CheckMethod method = request.checkMethod() == null
        ? CheckMethod.FIXED_VALUE : request.checkMethod();
    if (type != CheckType.NUMERIC || method != CheckMethod.FIXED_VALUE) {
      throw new IllegalArgumentException("当前版本仅支持数值型自定义 SQL 与固定值比较");
    }
    ComparisonOperator comparison = request.defaultOperator() == null
        ? ComparisonOperator.EQ : request.defaultOperator();
    BigDecimal threshold = request.defaultThreshold();
    if (threshold == null) {
      throw new IllegalArgumentException("默认阈值不能为空");
    }
    if (comparison == ComparisonOperator.BETWEEN
        && request.defaultThresholdEnd() == null) {
      throw new IllegalArgumentException("区间比较必须填写默认最大值");
    }
    String sql = sql(request.customSql());
    return new TemplateWrite(code, request.name().trim(), text(request.description()),
        request.dimension().trim(), schema(comparison, threshold,
        request.defaultThresholdEnd(), sql), folderId, sql, flags(request.setFlag()),
        type, method, operator);
  }

  private String schema(ComparisonOperator operator, BigDecimal threshold,
      BigDecimal end, String sql) {
    String fields = operator == ComparisonOperator.BETWEEN
        ? "[\"customSql\",\"operator\",\"threshold\",\"thresholdEnd\"]"
        : "[\"customSql\",\"operator\",\"threshold\"]";
    StringBuilder json = new StringBuilder("{\"fields\":").append(fields)
        .append(",\"defaultOperator\":\"").append(operator.name())
        .append("\",\"defaultThreshold\":").append(number(threshold));
    if (end != null) {
      json.append(",\"defaultThresholdEnd\":").append(number(end));
    }
    return json.append(",\"defaultSql\":\"")
        .append(escape(sql)).append("\"}").toString();
  }

  private String sql(String value) {
    String sql = text(value);
    if (sql == null) {
      throw new IllegalArgumentException("自定义 SQL 不能为空");
    }
    if (sql.endsWith(";")) {
      sql = sql.substring(0, sql.length() - 1).trim();
    }
    sql = sql.replace("${tableName}", "${table}");
    if (!sql.regionMatches(true, 0, "SELECT", 0, 6)
        || sql.contains(";") || sql.contains("--") || sql.contains("/*")) {
      throw new IllegalArgumentException("自定义 SQL 仅允许执行单条只读 SELECT 查询");
    }
    return sql;
  }

  private String flags(String value) {
    String flags = text(value);
    if (flags == null) {
      return null;
    }
    if (flags.contains(";")) {
      throw new IllegalArgumentException(
          "Set Flag 多条语句请使用英文逗号分隔，不要填写分号");
    }
    String result = String.join(",", Arrays.stream(flags.split(","))
        .map(String::trim).filter(item -> !item.isEmpty()).toList());
    return result.isEmpty() ? null : result;
  }

  private void validateParent(Long parentId, Long currentId) {
    if (parentId == null) {
      return;
    }
    if (parentId.equals(currentId)) {
      throw new IllegalArgumentException("规则模板目录不能选择自身作为上级目录");
    }
    folder(parentId);
    if (currentId == null) {
      return;
    }
    Map<Long, Long> parents = new HashMap<>();
    repository.listFolders().forEach(
        value -> parents.put(value.id(), value.parentId()));
    for (Long cursor = parentId; cursor != null; cursor = parents.get(cursor)) {
      if (cursor.equals(currentId)) {
        throw new IllegalArgumentException("规则模板目录不能移动到自己的子目录中");
      }
    }
  }

  private void validateFolder(Long id) {
    if (id != null) {
      folder(id);
    }
  }

  private FolderView folder(long id) {
    return repository.findFolder(id)
        .orElseThrow(() -> new IllegalArgumentException("规则模板目录不存在：" + id));
  }

  private void uniqueFolder(Long parent, String name, Long exclude) {
    if (repository.folderNameExists(parent, name, exclude)) {
      throw new IllegalStateException(
          "同级目录下已经存在名称为“" + name + "”的目录");
    }
  }

  private void uniqueTemplate(Long folder, String name, Long exclude) {
    if (repository.templateNameExists(folder, name, exclude)) {
      throw new IllegalStateException(
          "当前目录下已经存在名称为“" + name + "”的规则模板");
    }
  }

  private static String code() {
    return "CUSTOM_SQL_"
        + UUID.randomUUID().toString().replace("-", "").toUpperCase();
  }

  private static String number(BigDecimal value) {
    return value.stripTrailingZeros().toPlainString();
  }

  private static String escape(String value) {
    return value.replace("\\", "\\\\").replace("\"", "\\\"")
        .replace("\r", "\\r").replace("\n", "\\n");
  }

  private static Long folderId(Long value) {
    return value == null || value <= 0 ? null : value;
  }

  private static String operator(String value) {
    return value == null || value.isBlank() ? "system" : value.trim();
  }

  private static String text(String value) {
    if (value == null) {
      return null;
    }
    String result = value.trim();
    return result.isEmpty() ? null : result;
  }
}
