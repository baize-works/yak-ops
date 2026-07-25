package io.yak.ops.application.support.time;

import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.enums.TimeVariableValueType;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.dao.entity.TimeVariable;
import io.yak.ops.dao.repository.TimeVariableDao;
import io.yak.ops.web.contract.dto.TimeVariableRenderReq;
import io.yak.ops.web.contract.vo.TimeVariableRenderVO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DefaultTimeVariableRenderService implements TimeVariableRenderService {

    private static final Pattern VARIABLE_PATTERN =
            Pattern.compile("\\$\\{(?:var:)?([a-zA-Z][a-zA-Z0-9_]*)}");

    private static final String DEFAULT_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

    private static final DateTimeFormatter DEFAULT_DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern(DEFAULT_TIME_FORMAT);

    @Resource
    private TimeVariableDao timeVariableDao;

    @Resource
    private TimeExpressionEvaluator timeExpressionEvaluator;

    @Override
    public TimeVariableRenderVO render(TimeVariableRenderReq req) {
        validateRenderReq(req);

        try {
            LocalDateTime baseTime = parseBaseTime(req.getBaseTime());

            Map<String, String> overrideVariables = req.getOverrideVariables() == null
                    ? java.util.Collections.emptyMap()
                    : req.getOverrideVariables();

            Map<String, TimeVariable> variableMap = getAllEnabledVariables()
                    .stream()
                    .collect(Collectors.toMap(
                            TimeVariable::getParamName,
                            item -> item,
                            (first, second) -> first,
                            LinkedHashMap::new
                    ));

            return renderContent(req.getContent(), baseTime, overrideVariables, variableMap);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Render time variable failed, req={}", req, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    public List<TimeVariable> getAllEnabledVariables() {
        return timeVariableDao.queryEnabledList();
    }

    @Override
    public String renderContent(String content) {
        if (StringUtils.isBlank(content)) {
            return content;
        }

        TimeVariableRenderReq req = new TimeVariableRenderReq();
        req.setContent(content);

        TimeVariableRenderVO vo = render(req);

        if (vo.getUnresolvedVariables() != null && !vo.getUnresolvedVariables().isEmpty()) {
            throw new ServiceException(
                    Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                    "存在未解析的时间变量：" + vo.getUnresolvedVariables()
            );
        }

        return vo.getRenderedContent();
    }

    private TimeVariableRenderVO renderContent(
            String content,
            LocalDateTime baseTime,
            Map<String, String> overrideVariables,
            Map<String, TimeVariable> variableMap) {

        Matcher matcher = VARIABLE_PATTERN.matcher(content);

        StringBuffer renderedBuffer = new StringBuffer();
        TimeVariableRenderVO vo = new TimeVariableRenderVO();
        vo.setOriginalContent(content);

        Set<String> unresolvedNames = new LinkedHashSet<>();
        Set<String> addedVariableKeys = new LinkedHashSet<>();

        while (matcher.find()) {
            String variableName = matcher.group(1);

            if (overrideVariables.containsKey(variableName)) {
                String value = overrideVariables.get(variableName);

                addVariableItemIfAbsent(
                        vo,
                        addedVariableKeys,
                        variableName,
                        value,
                        "OVERRIDE",
                        null,
                        null
                );

                matcher.appendReplacement(renderedBuffer, Matcher.quoteReplacement(value));
                continue;
            }

            TimeVariable variable = variableMap.get(variableName);

            if (variable == null) {
                unresolvedNames.add(variableName);
                matcher.appendReplacement(renderedBuffer, Matcher.quoteReplacement(matcher.group(0)));
                continue;
            }

            String value = resolveVariableValue(variable, baseTime);

            addVariableItemIfAbsent(
                    vo,
                    addedVariableKeys,
                    variableName,
                    value,
                    variable.getVariableSource(),
                    variable.getExpression(),
                    variable.getTimeFormat()
            );

            matcher.appendReplacement(renderedBuffer, Matcher.quoteReplacement(value));
        }

        matcher.appendTail(renderedBuffer);

        vo.setRenderedContent(renderedBuffer.toString());
        vo.setUnresolvedVariables(new ArrayList<>(unresolvedNames));
        return vo;
    }

    private String resolveVariableValue(TimeVariable variable, LocalDateTime baseTime) {
        if (TimeVariableValueType.FIXED.name().equals(variable.getValueType())) {
            if (StringUtils.isBlank(variable.getDefaultValue())) {
                throw new ServiceException(
                        Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                        "固定值变量未配置默认值：" + variable.getParamName()
                );
            }
            return variable.getDefaultValue();
        }

        if (TimeVariableValueType.DYNAMIC.name().equals(variable.getValueType())) {
            if (StringUtils.isBlank(variable.getExpression())) {
                throw new ServiceException(
                        Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                        "动态变量未配置表达式：" + variable.getParamName()
                );
            }

            String timeFormat = StringUtils.isNotBlank(variable.getTimeFormat())
                    ? variable.getTimeFormat()
                    : DEFAULT_TIME_FORMAT;

            return timeExpressionEvaluator.evaluateToString(
                    variable.getExpression(),
                    timeFormat,
                    baseTime
            );
        }

        throw new ServiceException(
                Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                "不支持的变量取值方式：" + variable.getValueType()
        );
    }

    private void addVariableItemIfAbsent(
            TimeVariableRenderVO vo,
            Set<String> addedVariableKeys,
            String name,
            String value,
            String source,
            String expression,
            String timeFormat) {

        if (!addedVariableKeys.add(name)) {
            return;
        }

        TimeVariableRenderVO.VariableItem item = new TimeVariableRenderVO.VariableItem();
        item.setName(name);
        item.setValue(value);
        item.setSource(source);
        item.setExpression(expression);
        item.setTimeFormat(timeFormat);

        vo.getVariables().add(item);
    }

    private void validateRenderReq(TimeVariableRenderReq req) {
        if (req == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "timeVariableRenderReq");
        }
        if (StringUtils.isBlank(req.getContent())) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "content");
        }
    }

    private LocalDateTime parseBaseTime(String baseTime) {
        if (StringUtils.isBlank(baseTime)) {
            return LocalDateTime.now();
        }

        String text = baseTime.trim();

        List<DateTimeFormatter> formatters = Arrays.asList(
                DEFAULT_DATE_TIME_FORMATTER,
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
                DateTimeFormatter.ISO_LOCAL_DATE_TIME
        );

        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDateTime.parse(text, formatter);
            } catch (Exception ignored) {
            }
        }

        throw new ServiceException(
                Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                "基准时间格式不正确，请使用 yyyy-MM-dd HH:mm:ss"
        );
    }
}
