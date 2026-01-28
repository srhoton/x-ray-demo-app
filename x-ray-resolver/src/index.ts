/**
 * AppSync Lambda Resolver with ADOT Auto-Instrumentation
 *
 * This Lambda function serves as an AppSync direct resolver that calls
 * a backend ALB endpoint. X-Ray tracing is handled automatically by
 * the ADOT Node.js auto-instrumentation layer.
 */

import type { Context } from 'aws-lambda';
import { callBackend, BackendError } from './client';
import type { ClientConfig } from './client';
import type { AppSyncResolverEvent, HelloResponse, GraphQLError } from './types';
import * as logger from './logger';

/**
 * Load configuration from environment variables
 *
 * @throws {Error} If required environment variables are missing
 */
function loadConfig(): ClientConfig {
  const endpoint = process.env['ALB_ENDPOINT'];
  const path = process.env['API_PATH'] ?? '/api/hello';

  if (!endpoint) {
    throw new Error('ALB_ENDPOINT environment variable is required');
  }

  return { endpoint, path, timeout: 30000 };
}

/**
 * Create a GraphQL error response
 *
 * @param message - Error message
 * @param errorType - Error type/code
 * @returns GraphQL error object
 */
function createGraphQLError(message: string, errorType: string): GraphQLError {
  return { message, errorType };
}

/**
 * AppSync Lambda Resolver Handler
 *
 * Handles AppSync direct resolver events, calls the backend ALB,
 * and returns the response. X-Ray tracing is handled automatically
 * by the ADOT auto-instrumentation layer.
 *
 * @param event - AppSync resolver event
 * @param context - Lambda context
 * @returns Promise resolving to HelloResponse or GraphQLError
 */
export async function handler(
  _event: AppSyncResolverEvent,
  context: Context,
): Promise<HelloResponse | GraphQLError> {
  logger.info('Resolver invoked', { requestId: context.awsRequestId });

  try {
    const config = loadConfig();
    const response = await callBackend(config);
    logger.info('Backend response received', { status: 'success' });
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof BackendError) {
      logger.error('Backend error occurred', error);
      return createGraphQLError(`Backend error: ${error.message}`, 'BackendError');
    }

    logger.error('Internal error occurred', error instanceof Error ? error : new Error(errorMessage));
    return createGraphQLError(errorMessage, 'InternalError');
  }
}
