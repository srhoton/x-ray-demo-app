/**
 * OpenTelemetry X-Ray tracing configuration for AWS Lambda
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-lambda';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

/**
 * Initialize OpenTelemetry SDK with X-Ray configuration
 * This should be called once at module initialization, before the Lambda handler
 *
 * @returns NodeSDK instance
 */
export function initializeTracing(): NodeSDK {
  const serviceName = process.env['AWS_LAMBDA_FUNCTION_NAME'] ?? 'x-ray-resolver';
  const serviceVersion = process.env['SERVICE_VERSION'] ?? '1.0.0';

  // Create resource with service information
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
  });

  // Configure OTLP exporter for X-Ray
  const traceExporter = new OTLPTraceExporter({
    // Lambda layer sets this endpoint automatically
    url: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'http://localhost:4317',
  });

  // Initialize SDK with X-Ray propagator and auto-instrumentation
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      // Auto-instrument Node.js core modules
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable filesystem instrumentation for Lambda
        },
      }),
      // Specifically configure Lambda instrumentation
      new AwsInstrumentation({
        disableAwsContextPropagation: false,
        eventContextExtractor: (event) => {
          // Extract context from AppSync event if needed
          return {};
        },
      }),
      // Configure HTTP instrumentation for outbound requests
      new HttpInstrumentation({
        requestHook: (span, request) => {
          // Add custom attributes to HTTP spans
          span.setAttribute('http.target', request.path ?? 'unknown');
        },
        responseHook: (span, response) => {
          // Add response attributes
          if (response.statusCode) {
            span.setAttribute('http.status_code', response.statusCode);
          }
        },
      }),
    ],
    // Use X-Ray propagator for trace context
    textMapPropagator: new AWSXRayPropagator(),
  });

  // Start the SDK
  sdk.start();

  // Shutdown SDK on process termination
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.error('Error terminating tracing', error));
  });

  return sdk;
}

/**
 * Get the X-Ray trace ID from the environment
 * This is automatically set by Lambda when X-Ray tracing is enabled
 *
 * @returns X-Ray trace ID or null if not available
 */
export function getXRayTraceId(): string | null {
  return process.env['_X_AMZN_TRACE_ID'] ?? null;
}
