package io.yak.ops.common.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

/** LinkUp global exception, used to tell user more clearly error messages */
public class LinkUpRuntimeException extends RuntimeException {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final LinkUpErrorCode linkUpErrorCode;
    private final Map<String, String> params;

    public LinkUpRuntimeException(LinkUpErrorCode linkUpErrorCode, String errorMessage) {
        super(linkUpErrorCode.getErrorMessage() + " - " + errorMessage);
        this.linkUpErrorCode = linkUpErrorCode;
        this.params = new HashMap<>();
        ExceptionParamsUtil.assertParamsMatchWithDescription(
                linkUpErrorCode.getDescription(), params);
    }

    public LinkUpRuntimeException(
            LinkUpErrorCode linkUpErrorCode, String errorMessage, Throwable cause) {
        super(linkUpErrorCode.getErrorMessage() + " - " + errorMessage, cause);
        this.linkUpErrorCode = linkUpErrorCode;
        this.params = new HashMap<>();
        ExceptionParamsUtil.assertParamsMatchWithDescription(
                linkUpErrorCode.getDescription(), params);
    }

    public LinkUpRuntimeException(LinkUpErrorCode linkUpErrorCode, Throwable cause) {
        super(linkUpErrorCode.getErrorMessage(), cause);
        this.linkUpErrorCode = linkUpErrorCode;
        this.params = new HashMap<>();
        ExceptionParamsUtil.assertParamsMatchWithDescription(
                linkUpErrorCode.getDescription(), params);
    }

    public LinkUpRuntimeException(
            LinkUpErrorCode linkUpErrorCode, Map<String, String> params) {
        super(ExceptionParamsUtil.getDescription(linkUpErrorCode.getErrorMessage(), params));
        this.linkUpErrorCode = linkUpErrorCode;
        this.params = params;
    }

    public LinkUpRuntimeException(
            LinkUpErrorCode linkUpErrorCode, Map<String, String> params, Throwable cause) {
        super(
                ExceptionParamsUtil.getDescription(linkUpErrorCode.getErrorMessage(), params),
                cause);
        this.linkUpErrorCode = linkUpErrorCode;
        this.params = params;
    }

    public LinkUpErrorCode getLinkUpErrorCode() {
        return linkUpErrorCode;
    }

    public Map<String, String> getParams() {
        return params;
    }

    public Map<String, String> getParamsValueAsMap(String key) {
        try {
            return OBJECT_MAPPER.readValue(
                    params.get(key), new TypeReference<Map<String, String>>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }

    public <T> T getParamsValueAs(String key) {
        try {
            return OBJECT_MAPPER.readValue(params.get(key), new TypeReference<T>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }
}
