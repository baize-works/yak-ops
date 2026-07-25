package io.baize.flow.application.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.application.service.TimeVariableService;
import io.baize.flow.common.enums.TimeVariableSource;
import io.baize.flow.common.enums.TimeVariableValueType;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.application.support.time.TimeExpressionEvaluator;
import io.baize.flow.dao.entity.TimeVariable;
import io.baize.flow.dao.repository.TimeVariableDao;
import io.baize.flow.web.contract.dto.*;
import io.baize.flow.web.contract.response.PaginationResult;
import io.baize.flow.web.contract.vo.TimeVariablePreviewVO;
import io.baize.flow.web.contract.vo.TimeVariableRenderVO;
import io.baize.flow.web.contract.vo.TimeVariableVO;
import io.baize.flow.plugin.spi.enums.Status;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
public class TimeVariableServiceImpl implements TimeVariableService {

    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\$\\{([a-zA-Z][a-zA-Z0-9_]*)}");

    private static final Pattern PARAM_NAME_PATTERN = Pattern.compile("^[a-zA-Z][a-zA-Z0-9_]*$");

    private static final String DEFAULT_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

    private static final DateTimeFormatter DEFAULT_DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern(DEFAULT_TIME_FORMAT);

    @Resource
    private TimeVariableDao timeVariableDao;

    @Resource
    private TimeExpressionEvaluator timeExpressionEvaluator;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long create(TimeVariableCreateDTO dto) {
        validateCreateDto(dto);

        try {
            String paramName = dto.getParamName().trim();

            if (timeVariableDao.checkDuplicate(paramName)) {
                throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                        "时间变量名称已存在：" + paramName);
            }

            TimeVariable entity = new TimeVariable();
            BeanUtils.copyProperties(dto, entity);

            entity.setParamName(paramName);
            entity.setVariableSource(TimeVariableSource.CUSTOM.name());
            entity.setEnabled(dto.getEnabled() == null || dto.getEnabled());

            timeVariableDao.insert(entity);
            return entity.getId();
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Create time variable failed, dto={}", dto, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean update(Long id, TimeVariableUpdateDTO dto) {
        validateId(id);
        validateUpdateDto(dto);

        TimeVariable existing = getEntityOrThrow(id);

        if (TimeVariableSource.SYSTEM.name().equals(existing.getVariableSource())) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "系统内置变量不允许修改");
        }

        try {
            String targetParamName = StringUtils.isNotBlank(dto.getParamName())
                    ? dto.getParamName().trim()
                    : existing.getParamName();

            if (!PARAM_NAME_PATTERN.matcher(targetParamName).matches()) {
                throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                        "参数名称只能包含字母、数字、下划线，并且必须以字母开头");
            }

            if (timeVariableDao.checkDuplicateExcludeId(targetParamName, id)) {
                throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                        "时间变量名称已存在：" + targetParamName);
            }

            TimeVariable entity = new TimeVariable();
            BeanUtils.copyProperties(dto, entity);

            entity.setId(id);
            entity.setParamName(targetParamName);
            entity.setVariableSource(existing.getVariableSource());
            entity.initUpdate();

            timeVariableDao.updateById(entity);
            return true;
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Update time variable failed, id={}, dto={}", id, dto, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    public TimeVariableVO getById(Long id) {
        validateId(id);

        try {
            return toVO(getEntityOrThrow(id));
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Query time variable by id failed, id={}", id, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    public PaginationResult<TimeVariableVO> pageQuery(TimeVariablePageReq req) {
        if (req == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "timeVariablePageReq");
        }

        if (req.getPageNo() == null || req.getPageNo() <= 0) {
            req.setPageNo(1);
        }
        if (req.getPageSize() == null || req.getPageSize() <= 0) {
            req.setPageSize(10);
        }

        try {
            IPage<TimeVariable> pageResult = timeVariableDao.queryPage(req);

            List<TimeVariableVO> records = pageResult.getRecords()
                    .stream()
                    .map(this::toVO)
                    .collect(Collectors.toList());

            return PaginationResult.buildSuc(records, pageResult);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Page query time variable failed, req={}", req, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        validateId(id);

        TimeVariable entity = getEntityOrThrow(id);

        if (TimeVariableSource.SYSTEM.name().equals(entity.getVariableSource())) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "系统内置变量不允许删除");
        }

        try {
            timeVariableDao.deleteById(id);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Delete time variable failed, id={}", id, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    public TimeVariablePreviewVO preview(TimeVariablePreviewReq req) {
        validatePreviewReq(req);

        try {
            String timeFormat = StringUtils.isNotBlank(req.getTimeFormat())
                    ? req.getTimeFormat()
                    : DEFAULT_TIME_FORMAT;

            LocalDateTime baseTime = parseBaseTime(req.getBaseTime());

            String value = timeExpressionEvaluator.evaluateToString(
                    req.getExpression(),
                    timeFormat,
                    baseTime
            );

            return new TimeVariablePreviewVO(
                    req.getExpression(),
                    timeFormat,
                    baseTime.format(DEFAULT_DATE_TIME_FORMATTER),
                    value
            );
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Preview time variable failed, req={}", req, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }





    private void validateCreateDto(TimeVariableCreateDTO dto) {
        if (dto == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "timeVariableCreateDTO");
        }

        validateRequiredFields(dto.getParamName(), dto.getParamDesc(), dto.getValueType());
        validateParamName(dto.getParamName());
        validateValueRule(dto.getValueType(), dto.getDefaultValue(), dto.getExpression(), dto.getTimeFormat());
    }

    private void validateUpdateDto(TimeVariableUpdateDTO dto) {
        if (dto == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "timeVariableUpdateDTO");
        }

        if (StringUtils.isNotBlank(dto.getParamName())) {
            validateParamName(dto.getParamName());
        }

        if (StringUtils.isNotBlank(dto.getValueType())) {
            validateValueRule(dto.getValueType(), dto.getDefaultValue(), dto.getExpression(), dto.getTimeFormat());
        }
    }

    private void validateRequiredFields(String paramName, String paramDesc, String valueType) {
        if (StringUtils.isBlank(paramName)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "paramName");
        }
        if (StringUtils.isBlank(paramDesc)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "paramDesc");
        }
        if (StringUtils.isBlank(valueType)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "valueType");
        }
    }

    private void validateParamName(String paramName) {
        if (StringUtils.isBlank(paramName)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "paramName");
        }

        if (!PARAM_NAME_PATTERN.matcher(paramName.trim()).matches()) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                    "参数名称只能包含字母、数字、下划线，并且必须以字母开头");
        }
    }

    private void validateValueRule(
            String valueType,
            String defaultValue,
            String expression,
            String timeFormat) {

        if (!TimeVariableValueType.FIXED.name().equals(valueType)
                && !TimeVariableValueType.DYNAMIC.name().equals(valueType)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                    "取值方式只支持 FIXED / DYNAMIC");
        }

        if (TimeVariableValueType.FIXED.name().equals(valueType)) {
            if (StringUtils.isBlank(defaultValue)) {
                throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "defaultValue");
            }
            return;
        }

        if (StringUtils.isBlank(expression)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "expression");
        }
        if (StringUtils.isBlank(timeFormat)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "timeFormat");
        }

        try {
            timeExpressionEvaluator.evaluate(expression, LocalDateTime.now());
            DateTimeFormatter.ofPattern(timeFormat);
        } catch (Exception e) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, e.getMessage());
        }
    }

    private void validatePreviewReq(TimeVariablePreviewReq req) {
        if (req == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "timeVariablePreviewReq");
        }
        if (StringUtils.isBlank(req.getExpression())) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "expression");
        }
    }


    private void validateId(Long id) {
        if (id == null || id <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "id");
        }
    }

    private TimeVariable getEntityOrThrow(Long id) {
        TimeVariable entity = timeVariableDao.queryById(id);
        if (entity == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "时间变量不存在");
        }
        return entity;
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

        throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                "基准时间格式不正确，请使用 yyyy-MM-dd HH:mm:ss");
    }

    private TimeVariableVO toVO(TimeVariable entity) {
        TimeVariableVO vo = new TimeVariableVO();
        BeanUtils.copyProperties(entity, vo);
        return vo;
    }
}