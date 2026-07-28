package io.yak.ops.common.bean.vo.datasource;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 数据源动态表单配置。 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataSourcePluginConfigVO {

  private String pluginType;

  @Builder.Default
  private List<FormFieldVO> formFields = new ArrayList<>();

  @Builder.Default
  private Boolean installRequired = false;

  private String installHint;

  /** 动态表单字段。 */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class FormFieldVO {

    private String key;
    private String label;
    private String type;
    private String placeholder;
    private Object defaultValue;

    @Builder.Default
    private List<OptionVO> options = new ArrayList<>();

    @Builder.Default
    private List<RuleVO> rules = new ArrayList<>();
  }

  /** 下拉选项。 */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class OptionVO {

    private String label;
    private Object value;
  }

  /** 前端表单校验规则。 */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class RuleVO {

    private Boolean required;
    private String pattern;
    private Integer min;
    private Integer max;
    private String message;
  }
}
