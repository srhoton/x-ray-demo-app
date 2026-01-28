package com.example.xray;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanContext;

import org.jboss.logmanager.MDC;

/**
 * Utility class for adding X-Ray trace context to logging MDC. This ensures that logs include the
 * X-Ray trace ID in the correct format for correlation in the X-Ray console.
 */
public final class XRayLoggingContext {

  private XRayLoggingContext() {
    // Utility class
  }

  /** MDC key for X-Ray trace ID - uses underscore format expected by AWS */
  public static final String XRAY_TRACE_ID_KEY = "xray_trace_id";

  /** MDC key for OpenTelemetry trace ID */
  public static final String TRACE_ID_KEY = "trace_id";

  /** MDC key for OpenTelemetry span ID */
  public static final String SPAN_ID_KEY = "span_id";

  /**
   * Add X-Ray trace context to MDC from the current OpenTelemetry span. This method extracts the
   * trace ID from the current span and converts it to X-Ray format (1-{timestamp}-{trace-id}).
   */
  public static void addTraceContextToMDC() {
    Span currentSpan = Span.current();
    SpanContext spanContext = currentSpan.getSpanContext();

    if (spanContext.isValid()) {
      String otelTraceId = spanContext.getTraceId();
      String otelSpanId = spanContext.getSpanId();

      // Add OpenTelemetry trace/span IDs
      MDC.put(TRACE_ID_KEY, otelTraceId);
      MDC.put(SPAN_ID_KEY, otelSpanId);

      // Convert to X-Ray format: 1-{timestamp}-{trace-id}
      // OpenTelemetry trace ID is 32 hex chars
      // X-Ray format splits it: first 8 chars = timestamp, remaining 24 = trace ID
      if (otelTraceId.length() == 32) {
        String timestamp = otelTraceId.substring(0, 8);
        String traceIdPart = otelTraceId.substring(8);
        String xrayTraceId = String.format("1-%s-%s", timestamp, traceIdPart);
        MDC.put(XRAY_TRACE_ID_KEY, xrayTraceId);
      }
    }
  }

  /**
   * Remove trace context from MDC. Should be called in finally blocks to prevent context leakage.
   */
  public static void clearTraceContextFromMDC() {
    MDC.remove(XRAY_TRACE_ID_KEY);
    MDC.remove(TRACE_ID_KEY);
    MDC.remove(SPAN_ID_KEY);
  }
}
