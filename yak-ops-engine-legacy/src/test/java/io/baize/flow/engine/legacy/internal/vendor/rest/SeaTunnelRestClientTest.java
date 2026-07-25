package io.baize.flow.engine.legacy.internal.vendor.rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.baize.flow.engine.legacy.internal.vendor.exception.SeaTunnelClientException;
import java.net.ConnectException;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

class LegacyRestClientTest {
    private RestTemplate http;
    private LegacyRestClient client;

    @BeforeEach void setUp() {
        http = mock(RestTemplate.class);
        SeaTunnelClientResolver resolver = mock(SeaTunnelClientResolver.class);
        when(resolver.resolveBaseApiUrl(1L)).thenReturn("http://seatunnel:5801");
        client = new LegacyRestClient(http, resolver);
    }

    @Test void translatesConnectionFailures() {
        when(http.exchange(anyString(), eq(HttpMethod.GET), any(), eq(Map.class)))
                .thenThrow(new org.springframework.web.client.ResourceAccessException("down", new ConnectException()));
        SeaTunnelClientException error = assertThrows(SeaTunnelClientException.class, () -> client.jobInfo(1L, "9"));
        assertEquals(0, error.getHttpStatus());
        assertInstanceOf(ConnectException.class, error.getCause().getCause());
    }

    @Test void preservesNon2xxResponseDetails() {
        when(http.exchange(anyString(), eq(HttpMethod.GET), any(), eq(Map.class))).thenThrow(
                HttpServerErrorException.create(org.springframework.http.HttpStatus.BAD_GATEWAY, "bad gateway", null,
                        "upstream failed".getBytes(), null));
        SeaTunnelClientException error = assertThrows(SeaTunnelClientException.class, () -> client.jobInfo(1L, "9"));
        assertEquals(502, error.getHttpStatus());
        assertEquals("upstream failed", error.getResponseBody());
    }
}
