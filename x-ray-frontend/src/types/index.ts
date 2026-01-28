/**
 * Type definitions for the application
 */

/**
 * GraphQL response from AppSync getHello query
 */
export interface HelloResponse {
  message: string;
  timestamp: string;
}

/**
 * GraphQL query response wrapper
 */
export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

/**
 * GraphQL error structure
 */
export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
  extensions?: Record<string, unknown>;
}

/**
 * Application state for loading and error handling
 */
export interface AppState {
  loading: boolean;
  error: string | null;
  response: HelloResponse | null;
}
