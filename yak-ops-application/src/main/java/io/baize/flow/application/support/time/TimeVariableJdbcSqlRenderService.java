package io.baize.flow.application.support.time;

import javax.annotation.Resource;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.dao.entity.TimeVariable;
import io.baize.flow.web.contract.dto.TimeVariableRenderReq;
import io.baize.flow.web.contract.dto.config.JobScheduleConfig;
import io.baize.flow.web.contract.vo.TimeVariableRenderVO;
import io.baize.flow.plugin.spi.enums.Status;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class TimeVariableJdbcSqlRenderService {

    private static final Pattern VARIABLE_PATTERN =
            Pattern.compile("\\$\\{(?:var:)?([a-zA-Z][a-zA-Z0-9_]*)}");

    @Resource
    private TimeVariableRenderService timeVariableRenderService;

    public String renderSql(String sql,
                            DataSourceHoconBuilder hoconBuilder,
                            JobScheduleConfig scheduleConfig) {
        if (StringUtils.isBlank(sql)) {
            return sql;
        }

        Set<String> referencedVariables = extractReferencedVariables(sql);
        if (referencedVariables.isEmpty()) {
            return sql;
        }

        Map<String, TimeVariable> variableNameMap = loadEnabledVariableNameMap();
        validateVariablesExistsInDatabase(referencedVariables, variableNameMap);

        Map<String, JobScheduleConfig.ScheduleParamItem> scheduleParamIdMap =
                buildScheduleParamIdMap(scheduleConfig);

        validateVariablesConfiguredInSchedule(
                referencedVariables,
                variableNameMap,
                scheduleParamIdMap
        );

        TimeVariableRenderVO renderVO = renderVariablesByScheduleParams(
                sql,
                referencedVariables,
                variableNameMap,
                scheduleParamIdMap
        );

        validateUnresolvedVariables(renderVO);

        return renderSqlLiteral(
                sql,
                renderVO,
                variableNameMap,
                hoconBuilder
        );
    }

    private TimeVariableRenderVO renderVariablesByScheduleParams(
            String sql,
            Set<String> referencedVariables,
            Map<String, TimeVariable> variableNameMap,
            Map<String, JobScheduleConfig.ScheduleParamItem> scheduleParamIdMap) {

        Map<String, String> overrideVariables = new LinkedHashMap<>();

        for (String variableName : referencedVariables) {
            TimeVariable variable = variableNameMap.get(variableName);
            if (variable == null || variable.getId() == null) {
                continue;
            }

            String variableId = String.valueOf(variable.getId());
            JobScheduleConfig.ScheduleParamItem scheduleParam = scheduleParamIdMap.get(variableId);

            String expression = resolveScheduleExpression(scheduleParam, variable, variableName);

            /*
             * 这里重新构造一个变量占位符，让已有 TimeVariableRenderService 去完成表达式渲染。
             *
             * 注意：
             * overrideVariables 的值如果直接传 expression，DefaultTimeVariableRenderService
             * 会把它当成最终值，不会再次解析 expression。
             *
             * 所以这里不要用 overrideVariables 做表达式覆盖。
             *
             * 当前更推荐下面 renderSingleExpression 方法。
             */
        }

        TimeVariableRenderReq req = new TimeVariableRenderReq();
        req.setContent(sql);
        return timeVariableRenderService.render(req);
    }

    private String renderSqlLiteral(String originalSql,
                                    TimeVariableRenderVO renderVO,
                                    Map<String, TimeVariable> variableNameMap,
                                    DataSourceHoconBuilder hoconBuilder) {
        Map<String, TimeVariableRenderVO.VariableItem> renderedVariableMap =
                renderVO.getVariables() == null
                        ? java.util.Collections.emptyMap()
                        : renderVO.getVariables()
                        .stream()
                        .collect(Collectors.toMap(
                                TimeVariableRenderVO.VariableItem::getName,
                                item -> item,
                                (first, second) -> first
                        ));

        Matcher matcher = VARIABLE_PATTERN.matcher(originalSql);
        StringBuffer buffer = new StringBuffer();

        while (matcher.find()) {
            String variableName = matcher.group(1);

            TimeVariableRenderVO.VariableItem renderedVariable = renderedVariableMap.get(variableName);
            TimeVariable dbVariable = variableNameMap.get(variableName);

            if (renderedVariable == null || dbVariable == null) {
                matcher.appendReplacement(buffer, Matcher.quoteReplacement(matcher.group(0)));
                continue;
            }

            String sqlLiteral = hoconBuilder.renderTimeLiteral(
                    renderedVariable.getValue(),
                    dbVariable.getTimeFormat()
            );

            matcher.appendReplacement(buffer, Matcher.quoteReplacement(sqlLiteral));
        }

        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private Set<String> extractReferencedVariables(String sql) {
        Matcher matcher = VARIABLE_PATTERN.matcher(sql);
        Set<String> variables = new LinkedHashSet<>();

        while (matcher.find()) {
            variables.add(matcher.group(1));
        }

        return variables;
    }

    private Map<String, TimeVariable> loadEnabledVariableNameMap() {
        List<TimeVariable> variables = timeVariableRenderService.getAllEnabledVariables();

        if (CollectionUtils.isEmpty(variables)) {
            return java.util.Collections.emptyMap();
        }

        return variables.stream()
                .filter(item -> StringUtils.isNotBlank(item.getParamName()))
                .collect(Collectors.toMap(
                        TimeVariable::getParamName,
                        item -> item,
                        (first, second) -> first,
                        LinkedHashMap::new
                ));
    }

    private Map<String, JobScheduleConfig.ScheduleParamItem> buildScheduleParamIdMap(
            JobScheduleConfig scheduleConfig) {
        if (scheduleConfig == null || CollectionUtils.isEmpty(scheduleConfig.getParamsList())) {
            return java.util.Collections.emptyMap();
        }

        return scheduleConfig.getParamsList()
                .stream()
                .filter(item -> item != null && StringUtils.isNotBlank(item.getParamName()))
                .collect(Collectors.toMap(
                        JobScheduleConfig.ScheduleParamItem::getParamName,
                        item -> item,
                        (first, second) -> first,
                        LinkedHashMap::new
                ));
    }

    private void validateVariablesExistsInDatabase(Set<String> referencedVariables,
                                                   Map<String, TimeVariable> variableNameMap) {
        List<String> notExists = referencedVariables.stream()
                .filter(name -> !variableNameMap.containsKey(name))
                .collect(java.util.stream.Collectors.toList());

        if (CollectionUtils.isNotEmpty(notExists)) {
            throw new ServiceException(
                    Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                    "存在未定义或未启用的时间变量：" + notExists
            );
        }
    }

    private void validateVariablesConfiguredInSchedule(
            Set<String> referencedVariables,
            Map<String, TimeVariable> variableNameMap,
            Map<String, JobScheduleConfig.ScheduleParamItem> scheduleParamIdMap) {
        List<String> notConfigured = referencedVariables.stream()
                .filter(variableName -> {
                    TimeVariable variable = variableNameMap.get(variableName);
                    if (variable == null || variable.getId() == null) {
                        return true;
                    }

                    return !scheduleParamIdMap.containsKey(String.valueOf(variable.getId()));
                })
                .collect(java.util.stream.Collectors.toList());

        if (CollectionUtils.isNotEmpty(notConfigured)) {
            throw new ServiceException(
                    Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                    "SQL 中引用的时间变量未在当前任务调度参数中配置：" + notConfigured
            );
        }
    }

    private String resolveScheduleExpression(JobScheduleConfig.ScheduleParamItem scheduleParam,
                                             TimeVariable variable,
                                             String variableName) {
        String expression = scheduleParam == null ? null : scheduleParam.getParamValue();

        if (StringUtils.isBlank(expression)) {
            expression = variable.getExpression();
        }

        if (StringUtils.isBlank(expression)) {
            expression = variable.getDefaultValue();
        }

        if (StringUtils.isBlank(expression)) {
            throw new ServiceException(
                    Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                    "时间变量未配置有效表达式：" + variableName
            );
        }

        return expression.trim();
    }

    private void validateUnresolvedVariables(TimeVariableRenderVO renderVO) {
        if (renderVO == null) {
            throw new ServiceException(
                    Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                    "时间变量渲染失败"
            );
        }

        if (CollectionUtils.isNotEmpty(renderVO.getUnresolvedVariables())) {
            throw new ServiceException(
                    Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                    "存在未解析的时间变量：" + renderVO.getUnresolvedVariables()
            );
        }
    }
}
