package io.yak.ops.api.exceptions;

import io.yak.ops.application.model.response.Result;
import org.apache.ibatis.exceptions.PersistenceException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApiExceptionHandlerTest {

    @Test
    void persistenceFailureIsReportedAsInternalErrorNotMissingResource() {
        ApiExceptionHandler handler = new ApiExceptionHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/login");

        Result<Object> result = handler.handleInternalException(
                new PersistenceException("user result mapping failed"), request);

        assertTrue(result.getMsg().contains("Internal server error"));
        assertFalse(result.getMsg().contains("Resource not found"));
    }
}
