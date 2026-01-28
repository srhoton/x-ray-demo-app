package com.example.xray;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import io.opentelemetry.context.propagation.TextMapGetter;
import io.opentelemetry.context.propagation.TextMapPropagator;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.trace.SdkTracerProvider;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.ApplicationLoadBalancerRequestEvent;
import com.amazonaws.services.lambda.runtime.events.ApplicationLoadBalancerResponseEvent;

/**
 * ALB Lambda handler with proper X-Ray trace context propagation. This is a Quarkus CDI managed
 * bean that properly bootstraps OpenTelemetry. Extracts the incoming X-Amzn-Trace-Id header from
 * the ALB request and creates child spans linked to the parent trace.
 */
@Named("alb")
@ApplicationScoped
public class AlbLambdaHandler
    implements RequestHandler<
        ApplicationLoadBalancerRequestEvent, ApplicationLoadBalancerResponseEvent> {

  private static final Logger logger = LoggerFactory.getLogger(AlbLambdaHandler.class);

  @Inject Tracer tracer;

  @Inject OpenTelemetry openTelemetry;

  /** TextMapGetter implementation for extracting trace context from ALB request headers. */
  private static final TextMapGetter<ApplicationLoadBalancerRequestEvent> ALB_HEADER_GETTER =
      new TextMapGetter<>() {
        @Override
        public Iterable<String> keys(ApplicationLoadBalancerRequestEvent carrier) {
          Map<String, String> headers = carrier.getHeaders();
          return headers != null ? headers.keySet() : Collections.emptySet();
        }

        @Override
        public String get(ApplicationLoadBalancerRequestEvent carrier, String key) {
          if (carrier == null) {
            return null;
          }
          // Check single-value headers first
          Map<String, String> headers = carrier.getHeaders();
          if (headers != null) {
            // Case-insensitive header lookup
            for (Map.Entry<String, String> entry : headers.entrySet()) {
              if (entry.getKey().equalsIgnoreCase(key)) {
                return entry.getValue();
              }
            }
          }
          // Check multi-value headers
          Map<String, List<String>> multiHeaders = carrier.getMultiValueHeaders();
          if (multiHeaders != null) {
            for (Map.Entry<String, List<String>> entry : multiHeaders.entrySet()) {
              if (entry.getKey().equalsIgnoreCase(key)) {
                List<String> values = entry.getValue();
                return (values != null && !values.isEmpty()) ? values.get(0) : null;
              }
            }
          }
          return null;
        }
      };

  @Override
  public ApplicationLoadBalancerResponseEvent handleRequest(
      ApplicationLoadBalancerRequestEvent event,
      com.amazonaws.services.lambda.runtime.Context context) {

    // Add X-Ray trace context to MDC for log correlation
    XRayLoggingContext.addTraceContextToMDC();

    // Log the incoming trace header for debugging
    String incomingTraceId = getHeaderValue(event, "X-Amzn-Trace-Id");
    logger.info(
        "Received request: method={}, path={}, traceId={}",
        event.getHttpMethod(),
        event.getPath(),
        incomingTraceId);

    // Get propagator from OpenTelemetry instance
    TextMapPropagator propagator = openTelemetry.getPropagators().getTextMapPropagator();

    // Extract trace context from incoming request headers
    Context extractedContext = propagator.extract(Context.current(), event, ALB_HEADER_GETTER);
    logger.info(
        "Extracted context: isValid={}",
        Span.fromContext(extractedContext).getSpanContext().isValid());

    // Start a span as a child of the extracted context
    Span span =
        tracer
            .spanBuilder("alb-request-handler")
            .setParent(extractedContext)
            .setSpanKind(SpanKind.SERVER)
            .startSpan();

    logger.info(
        "Created span with traceId={}, spanId={}",
        span.getSpanContext().getTraceId(),
        span.getSpanContext().getSpanId());

    ApplicationLoadBalancerResponseEvent response;

    // Make this span the current span
    try (Scope scope = span.makeCurrent()) {
      span.setAttribute("http.method", event.getHttpMethod());
      span.setAttribute("http.url", event.getPath());
      span.setAttribute("http.target", event.getPath());
      span.setAttribute("aws.lambda.request_id", context.getAwsRequestId());
      span.setAttribute("aws.lambda.function_name", context.getFunctionName());

      if (incomingTraceId != null) {
        span.setAttribute("xray.trace_id", incomingTraceId);
      }

      // Route based on path
      if ("/api/hello".equals(event.getPath()) && "GET".equals(event.getHttpMethod())) {
        response = handleHello();
        span.setAttribute("http.status_code", response.getStatusCode());
        span.setStatus(StatusCode.OK);
      } else if ("/api/hello".equals(event.getPath())) {
        // Health check path
        response = handleHello();
        span.setAttribute("http.status_code", response.getStatusCode());
        span.setStatus(StatusCode.OK);
      } else {
        span.setAttribute("http.status_code", 404);
        span.setStatus(StatusCode.ERROR, "Not Found");
        response = createResponse(404, "{\"message\":\"Not Found\"}");
      }

    } catch (Exception e) {
      logger.error("Error processing request", e);
      span.recordException(e);
      span.setStatus(StatusCode.ERROR, e.getMessage());
      response = createResponse(500, "{\"message\":\"Internal Server Error\"}");
    } finally {
      span.end();
      logger.info("Span ended, flushing traces...");
      forceFlushSpans();
      // Clean up MDC to prevent context leakage
      XRayLoggingContext.clearTraceContextFromMDC();
    }

    return response;
  }

  /** Force flush all spans to ensure they are exported before Lambda freezes. */
  private void forceFlushSpans() {
    try {
      if (openTelemetry instanceof OpenTelemetrySdk) {
        OpenTelemetrySdk sdk = (OpenTelemetrySdk) openTelemetry;
        SdkTracerProvider tracerProvider = sdk.getSdkTracerProvider();
        tracerProvider.forceFlush().join(10, TimeUnit.SECONDS);
        logger.info("Successfully flushed OpenTelemetry spans");
      } else {
        logger.warn(
            "OpenTelemetry instance is not SDK type: {}, cannot force flush",
            openTelemetry.getClass().getName());
      }
    } catch (Exception e) {
      logger.error("Failed to force flush OpenTelemetry spans", e);
    }
  }

  private ApplicationLoadBalancerResponseEvent handleHello() {
    Span span = tracer.spanBuilder("hello-operation").setSpanKind(SpanKind.INTERNAL).startSpan();

    try (Scope scope = span.makeCurrent()) {
      // Update MDC with the new span context
      XRayLoggingContext.addTraceContextToMDC();
      logger.info("Processing hello request");

      span.setAttribute("service.operation", "hello");
      span.setAttribute("custom.greeting", "Hello World");

      String timestamp = Instant.now().toString();
      String body = String.format("{\"message\":\"Hello World\",\"timestamp\":\"%s\"}", timestamp);

      logger.info("Returning hello response at {}", timestamp);

      return createResponse(200, body);

    } finally {
      span.end();
    }
  }

  private ApplicationLoadBalancerResponseEvent createResponse(int statusCode, String body) {
    ApplicationLoadBalancerResponseEvent response = new ApplicationLoadBalancerResponseEvent();
    response.setStatusCode(statusCode);
    response.setStatusDescription(getStatusDescription(statusCode));
    response.setBody(body);
    response.setIsBase64Encoded(false);

    // Set single-value headers (required by ALB)
    Map<String, String> singleHeaders = new HashMap<>();
    singleHeaders.put("Content-Type", "application/json");
    response.setHeaders(singleHeaders);

    // Also set multi-value headers for compatibility
    Map<String, List<String>> multiHeaders = new HashMap<>();
    multiHeaders.put("Content-Type", Collections.singletonList("application/json"));
    response.setMultiValueHeaders(multiHeaders);

    return response;
  }

  private String getStatusDescription(int statusCode) {
    return switch (statusCode) {
      case 200 -> "200 OK";
      case 404 -> "404 Not Found";
      case 500 -> "500 Internal Server Error";
      default -> statusCode + " Unknown";
    };
  }

  private String getHeaderValue(ApplicationLoadBalancerRequestEvent event, String headerName) {
    Map<String, String> headers = event.getHeaders();
    if (headers != null) {
      for (Map.Entry<String, String> entry : headers.entrySet()) {
        if (entry.getKey().equalsIgnoreCase(headerName)) {
          return entry.getValue();
        }
      }
    }
    return null;
  }
}
