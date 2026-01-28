/**
 * AppSync GraphQL client
 * Handles GraphQL queries to the AppSync API
 */

import config from '../config';
import type { GraphQLResponse, HelloResponse } from '../types';
import { recordError, recordEvent } from './rum';

/**
 * GraphQL query for getHello
 */
const GET_HELLO_QUERY = `
  query GetHello {
    getHello {
      message
      timestamp
    }
  }
`;

/**
 * Execute a GraphQL query against AppSync
 */
async function executeGraphQLQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphQLResponse<T>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-api-key': config.appsync.apiKey,
  };

  const body = JSON.stringify({
    query,
    variables: variables || {},
  });

  try {
    const response = await fetch(config.appsync.url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as GraphQLResponse<T>;
    return result;
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error('Unknown error occurred');
    recordError(err);
    throw err;
  }
}

/**
 * Call the getHello query
 * Returns the response data or throws an error
 */
export async function callGetHello(): Promise<HelloResponse> {
  const startTime = Date.now();

  try {
    recordEvent('appsync_query_start', {
      query: 'getHello',
      timestamp: new Date().toISOString(),
    });

    const response = await executeGraphQLQuery<{ getHello: HelloResponse }>(
      GET_HELLO_QUERY
    );

    const duration = Date.now() - startTime;

    if (response.errors !== undefined && response.errors.length > 0) {
      const errorMessage =
        response.errors[0]?.message || 'Unknown GraphQL error';
      const error = new Error(`GraphQL error: ${errorMessage}`);
      recordError(error);
      throw error;
    }

    if (response.data?.getHello === undefined) {
      const error = new Error('No data returned from getHello query');
      recordError(error);
      throw error;
    }

    recordEvent('appsync_query_success', {
      query: 'getHello',
      duration,
      timestamp: new Date().toISOString(),
    });

    return response.data.getHello;
  } catch (error) {
    const duration = Date.now() - startTime;
    const err =
      error instanceof Error ? error : new Error('Unknown error occurred');

    recordEvent('appsync_query_error', {
      query: 'getHello',
      duration,
      error: err.message,
      timestamp: new Date().toISOString(),
    });

    throw err;
  }
}
