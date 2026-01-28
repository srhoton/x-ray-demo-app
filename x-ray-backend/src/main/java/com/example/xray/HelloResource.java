package com.example.xray;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.example.xray.model.HelloResponse;

/**
 * REST resource that provides a simple hello endpoint. This resource is instrumented with
 * OpenTelemetry for AWS X-Ray tracing.
 */
@Path("/api/hello")
@Produces(MediaType.APPLICATION_JSON)
public class HelloResource {

  private static final Logger logger = LoggerFactory.getLogger(HelloResource.class);

  @Inject Tracer tracer;

  /**
   * Returns a hello world message with timestamp. This endpoint is automatically traced by
   * OpenTelemetry and sent to AWS X-Ray.
   *
   * @return A HelloResponse containing message and timestamp
   */
  @GET
  public HelloResponse hello() {
    Span span = tracer.spanBuilder("hello-operation").startSpan();
    try {
      logger.info("Processing hello request");

      // Add custom attributes to the span for X-Ray
      span.setAttribute("service.operation", "hello");
      span.setAttribute("custom.greeting", "Hello World");

      HelloResponse response = new HelloResponse("Hello World");
      logger.info("Returning hello response at {}", response.getTimestamp());

      return response;
    } catch (Exception e) {
      logger.error("Error processing hello request", e);
      span.recordException(e);
      throw e;
    } finally {
      span.end();
    }
  }
}
