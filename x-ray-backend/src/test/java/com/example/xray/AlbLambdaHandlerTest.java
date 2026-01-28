package com.example.xray;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.inject.Inject;

import io.quarkus.test.junit.QuarkusTest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.amazonaws.services.lambda.runtime.events.ApplicationLoadBalancerRequestEvent;
import com.amazonaws.services.lambda.runtime.events.ApplicationLoadBalancerResponseEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Unit tests for the AlbLambdaHandler. Tests verify the handler correctly processes ALB requests,
 * routes to appropriate handlers, and returns proper responses.
 */
@QuarkusTest
public class AlbLambdaHandlerTest {

  @Inject AlbLambdaHandler handler;

  private final ObjectMapper objectMapper = new ObjectMapper();

  /**
   * Create a mock ALB request event.
   *
   * @param method HTTP method
   * @param path Request path
   * @return Configured ALB request event
   */
  private ApplicationLoadBalancerRequestEvent createEvent(String method, String path) {
    ApplicationLoadBalancerRequestEvent event = new ApplicationLoadBalancerRequestEvent();
    event.setHttpMethod(method);
    event.setPath(path);

    Map<String, String> headers = new HashMap<>();
    headers.put("Content-Type", "application/json");
    event.setHeaders(headers);

    return event;
  }

  /**
   * Create a mock ALB request event with X-Ray trace header.
   *
   * @param method HTTP method
   * @param path Request path
   * @param traceId X-Ray trace ID
   * @return Configured ALB request event
   */
  private ApplicationLoadBalancerRequestEvent createEventWithTrace(
      String method, String path, String traceId) {
    ApplicationLoadBalancerRequestEvent event = createEvent(method, path);

    Map<String, String> headers = event.getHeaders();
    headers.put("X-Amzn-Trace-Id", traceId);
    event.setHeaders(headers);

    return event;
  }

  /**
   * Create a mock Lambda context.
   *
   * @return Mock Lambda context
   */
  private com.amazonaws.services.lambda.runtime.Context createMockContext() {
    com.amazonaws.services.lambda.runtime.Context context =
        mock(com.amazonaws.services.lambda.runtime.Context.class);
    when(context.getAwsRequestId()).thenReturn("test-request-id-12345");
    when(context.getFunctionName()).thenReturn("x-ray-backend");
    when(context.getMemoryLimitInMB()).thenReturn(1024);
    when(context.getRemainingTimeInMillis()).thenReturn(30000);
    return context;
  }

  @Test
  @DisplayName(
      "handleRequest - GET /api/hello - should return 200 with Hello World message and timestamp")
  void handleRequest_getHello_returnsHelloWorldResponse() throws Exception {
    // Arrange
    ApplicationLoadBalancerRequestEvent event = createEvent("GET", "/api/hello");
    com.amazonaws.services.lambda.runtime.Context context = createMockContext();

    // Act
    ApplicationLoadBalancerResponseEvent response = handler.handleRequest(event, context);

    // Assert
    assertThat(response.getStatusCode()).isEqualTo(200);
    assertThat(response.getHeaders().get("Content-Type")).isEqualTo("application/json");

    JsonNode body = objectMapper.readTree(response.getBody());
    assertThat(body.get("message").asText()).isEqualTo("Hello World");
    assertThat(body.has("timestamp")).isTrue();
  }

  @Test
  @DisplayName("handleRequest - GET /api/hello with trace header - should return 200")
  void handleRequest_getHelloWithTraceHeader_returns200() throws Exception {
    // Arrange
    String traceId = "Root=1-67890abc-12345678901234567890abcd;Parent=1234567890abcdef;Sampled=1";
    ApplicationLoadBalancerRequestEvent event = createEventWithTrace("GET", "/api/hello", traceId);
    com.amazonaws.services.lambda.runtime.Context context = createMockContext();

    // Act
    ApplicationLoadBalancerResponseEvent response = handler.handleRequest(event, context);

    // Assert
    assertThat(response.getStatusCode()).isEqualTo(200);

    JsonNode body = objectMapper.readTree(response.getBody());
    assertThat(body.get("message").asText()).isEqualTo("Hello World");
  }

  @Test
  @DisplayName("handleRequest - GET /unknown/path - should return 404 Not Found")
  void handleRequest_unknownPath_returns404() throws Exception {
    // Arrange
    ApplicationLoadBalancerRequestEvent event = createEvent("GET", "/unknown/path");
    com.amazonaws.services.lambda.runtime.Context context = createMockContext();

    // Act
    ApplicationLoadBalancerResponseEvent response = handler.handleRequest(event, context);

    // Assert
    assertThat(response.getStatusCode()).isEqualTo(404);
    assertThat(response.getStatusDescription()).isEqualTo("404 Not Found");

    JsonNode body = objectMapper.readTree(response.getBody());
    assertThat(body.get("message").asText()).isEqualTo("Not Found");
  }

  @Test
  @DisplayName("handleRequest - POST /api/hello - should return 200 (routed to hello handler)")
  void handleRequest_postHello_returnsHelloResponse() throws Exception {
    // Arrange - The handler routes all /api/hello requests to handleHello
    ApplicationLoadBalancerRequestEvent event = createEvent("POST", "/api/hello");
    com.amazonaws.services.lambda.runtime.Context context = createMockContext();

    // Act
    ApplicationLoadBalancerResponseEvent response = handler.handleRequest(event, context);

    // Assert
    assertThat(response.getStatusCode()).isEqualTo(200);

    JsonNode body = objectMapper.readTree(response.getBody());
    assertThat(body.get("message").asText()).isEqualTo("Hello World");
  }

  @Test
  @DisplayName("handleRequest - response headers - should include Content-Type application/json")
  void handleRequest_responseHeaders_includesContentType() {
    // Arrange
    ApplicationLoadBalancerRequestEvent event = createEvent("GET", "/api/hello");
    com.amazonaws.services.lambda.runtime.Context context = createMockContext();

    // Act
    ApplicationLoadBalancerResponseEvent response = handler.handleRequest(event, context);

    // Assert
    assertThat(response.getHeaders()).isNotNull();
    assertThat(response.getHeaders().get("Content-Type")).isEqualTo("application/json");
    assertThat(response.getMultiValueHeaders()).isNotNull();
    assertThat(response.getMultiValueHeaders().get("Content-Type"))
        .isEqualTo(Collections.singletonList("application/json"));
  }

  @Test
  @DisplayName("handleRequest - response structure - should not be base64 encoded")
  void handleRequest_responseStructure_notBase64Encoded() {
    // Arrange
    ApplicationLoadBalancerRequestEvent event = createEvent("GET", "/api/hello");
    com.amazonaws.services.lambda.runtime.Context context = createMockContext();

    // Act
    ApplicationLoadBalancerResponseEvent response = handler.handleRequest(event, context);

    // Assert
    assertThat(response.getIsBase64Encoded()).isFalse();
  }

  @Test
  @DisplayName("handleRequest - with multi-value headers - should process request")
  void handleRequest_multiValueHeaders_processesRequest() throws Exception {
    // Arrange
    ApplicationLoadBalancerRequestEvent event = createEvent("GET", "/api/hello");
    Map<String, List<String>> multiHeaders = new HashMap<>();
    multiHeaders.put(
        "X-Amzn-Trace-Id", Collections.singletonList("Root=1-67890abc-12345678901234567890abcd"));
    event.setMultiValueHeaders(multiHeaders);
    com.amazonaws.services.lambda.runtime.Context context = createMockContext();

    // Act
    ApplicationLoadBalancerResponseEvent response = handler.handleRequest(event, context);

    // Assert
    assertThat(response.getStatusCode()).isEqualTo(200);
  }

  @Test
  @DisplayName("handleRequest - status description - should return correct status descriptions")
  void handleRequest_statusDescription_correctForStatusCodes() {
    // Arrange - Test 200 OK
    ApplicationLoadBalancerRequestEvent event200 = createEvent("GET", "/api/hello");
    com.amazonaws.services.lambda.runtime.Context context = createMockContext();

    // Act
    ApplicationLoadBalancerResponseEvent response200 = handler.handleRequest(event200, context);

    // Assert
    assertThat(response200.getStatusDescription()).isEqualTo("200 OK");

    // Arrange - Test 404 Not Found
    ApplicationLoadBalancerRequestEvent event404 = createEvent("GET", "/nonexistent");

    // Act
    ApplicationLoadBalancerResponseEvent response404 = handler.handleRequest(event404, context);

    // Assert
    assertThat(response404.getStatusDescription()).isEqualTo("404 Not Found");
  }
}
