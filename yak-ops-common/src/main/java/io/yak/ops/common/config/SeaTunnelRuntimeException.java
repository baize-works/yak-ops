package io.yak.ops.common.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

/** SeaTunnel global exception, used to tell user more clearly error messages */
public class SeaTunnelRuntimeException extends RuntimeException {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final SeaTunnelErrorCode seaTunnelErrorCode;
    private final Map<String, String> params;

    public SeaTunnelRuntimeException(SeaTunnelErrorCode seaTunnelErrorCode, String errorMessage) {
        super(seaTunnelErrorCode.getErrorMessage() + " - " + errorMessage);
        this.seaTunnelErrorCode = seaTunnelErrorCode;
        this.params = new HashMap<>();
        ExceptionParamsUtil.assertParamsMatchWithDescription(
                seaTunnelErrorCode.getDescription(), params);
    }

    public SeaTunnelRuntimeException(
            SeaTunnelErrorCode seaTunnelErrorCode, String errorMessage, Throwable cause) {
        super(seaTunnelErrorCode.getErrorMessage() + " - " + errorMessage, cause);
        this.seaTunnelErrorCode = seaTunnelErrorCode;
        this.params = new HashMap<>();
        ExceptionParamsUtil.assertParamsMatchWithDescription(
                seaTunnelErrorCode.getDescription(), params);
    }

    public SeaTunnelRuntimeException(SeaTunnelErrorCode seaTunnelErrorCode, Throwable cause) {
        super(seaTunnelErrorCode.getErrorMessage(), cause);
        this.seaTunnelErrorCode = seaTunnelErrorCode;
        this.params = new HashMap<>();
        ExceptionParamsUtil.assertParamsMatchWithDescription(
                seaTunnelErrorCode.getDescription(), params);
    }

    public SeaTunnelRuntimeException(
            SeaTunnelErrorCode seaTunnelErrorCode, Map<String, String> params) {
        super(ExceptionParamsUtil.getDescription(seaTunnelErrorCode.getErrorMessage(), params));
        this.seaTunnelErrorCode = seaTunnelErrorCode;
        this.params = params;
    }

    public SeaTunnelRuntimeException(
            SeaTunnelErrorCode seaTunnelErrorCode, Map<String, String> params, Throwable cause) {
        super(
                ExceptionParamsUtil.getDescription(seaTunnelErrorCode.getErrorMessage(), params),
                cause);
        this.seaTunnelErrorCode = seaTunnelErrorCode;
        this.params = params;
    }

    public SeaTunnelErrorCode getSeaTunnelErrorCode() {
        return seaTunnelErrorCode;
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
