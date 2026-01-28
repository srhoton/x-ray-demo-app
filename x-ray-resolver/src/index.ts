/**
 * AppSync Lambda Resolver with OpenTelemetry X-Ray Tracing
 *
 * This Lambda function serves as an AppSync direct resolver that calls
 * a backend ALB endpoint and propagates X-Ray trace context.
 */

import { trace, SpanStatusCode } from '@opentelemetry/api';
import type { Context } from 'aws-lambda';
import { initializeTracing } from './tracing';
import { callBackend, BackendError } from './client';
import type { AppSyncResolverEvent, HelloResponse, GraphQLError } from './types';

// Initialize OpenTelemetry tracing at module load time
initializeTracing();

/**
 * Environment configuration
 */
interface Config {
  readonly albEndpoint: string;
  readonly apiPath: string;
}

/**
 * Load configuration from environment variables
 *
 * @throws {Error} If required environment variables are missing
 */
function loadConfig(): Config {
  const albEndpoint = process.env['ALB_ENDPOINT'];
  const apiPath = process.env['API_PATH'];

  if (!albEndpoint) {
    throw new Error('ALB_ENDPOINT environment variable is required');
  }

  if (!apiPath) {
    throw new Error('API_PATH environment variable is required');
  }

  return {
    albEndpoint,
    apiPath,
  };
}

/**
 * Create a GraphQL error response
 *
 * @param message - Error message
 * @param errorType - Error type/code
 * @param errorInfo - Additional error information
 * @returns GraphQL error object
 */
function createGraphQLError(
  message: string,
  errorType: string = 'InternalError',
  errorInfo?: Record<string, unknown>,
): GraphQLError {
  return {
    message,
    errorType,
    errorInfo,
  };
}

/**
 * AppSync Lambda Resolver Handler
 *
 * Handles AppSync direct resolver events, calls the backend ALB,
 * and returns the response with proper X-Ray tracing.
 *
 * @param event - AppSync resolver event
 * @param context - Lambda context
 * @returns Promise resolving to HelloResponse or GraphQLError
 */
export async function handler(
  event: AppSyncResolverEvent,
  context: Context,
): Promise<HelloResponse | GraphQLError> {
  const tracer = trace.getTracer('x-ray-resolver');

  return tracer.startActiveSpan('AppSyncResolverHandler', async (span) => {
    try {
      // Add span attributes
      span.setAttribute('graphql.operation.type', 'query');
      span.setAttribute('graphql.field.name', event.fieldName);
      span.setAttribute('graphql.type.name', event.typeName);
      span.setAttribute('aws.lambda.request_id', context.requestId);

      // Log the incoming event
      console.log('Received AppSync event:', {
        fieldName: event.fieldName,
        typeName: event.typeName,
        requestId: context.requestId,
      });

      // Validate field name
      if (event.fieldName !== 'getHello') {
        const errorMsg = `Unsupported field: ${event.fieldName}`;
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        span.end();

        return createGraphQLError(errorMsg, 'InvalidField', {
          fieldName: event.fieldName,
        });
      }

      // Load configuration
      const config = loadConfig();

      // Call the backend ALB
      const response = await callBackend({
        endpoint: config.albEndpoint,
        path: config.apiPath,
        timeout: 30000,
      });

      // Log successful response
      console.log('Backend response:', response);

      // Mark span as successful
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return response;
    } catch (error) {
      // Log the error
      console.error('Error in resolver:', error);

      // Record error in span
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });

      if (error instanceof Error) {
        span.recordException(error);
      }

      span.end();

      // Handle different error types
      if (error instanceof BackendError) {
        return createGraphQLError(
          `Backend error: ${error.message}`,
          'BackendError',
          {
            statusCode: error.statusCode,
            body: error.body,
          },
        );
      }

      // Generic error
      return createGraphQLError(
        errorMessage,
        'InternalError',
      );
    }
  });
}
