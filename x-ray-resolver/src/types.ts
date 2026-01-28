/**
 * TypeScript type definitions for AppSync Lambda Resolver
 */

/**
 * AppSync Direct Lambda Resolver Event
 * This is the event structure that AppSync sends to a direct Lambda resolver
 */
export interface AppSyncResolverEvent<TArguments = Record<string, unknown>> {
  /**
   * The GraphQL type name for the parent object
   */
  readonly typeName: string;

  /**
   * The GraphQL field name being resolved
   */
  readonly fieldName: string;

  /**
   * The arguments passed to the GraphQL field
   */
  readonly arguments: TArguments;

  /**
   * The identity of the caller (if using authentication)
   */
  readonly identity: AppSyncIdentity | null;

  /**
   * The parent object's resolved value (for nested resolvers)
   */
  readonly source: Record<string, unknown> | null;

  /**
   * Request metadata including headers
   */
  readonly request: AppSyncRequest;

  /**
   * Previous resolver results (for pipeline resolvers)
   */
  readonly prev: AppSyncPreviousResult | null;

  /**
   * Stash for passing data between pipeline resolver functions
   */
  readonly stash: Record<string, unknown>;
}

/**
 * AppSync request metadata
 */
export interface AppSyncRequest {
  /**
   * Request headers from the GraphQL request
   */
  readonly headers: Record<string, string>;

  /**
   * Domain name for the AppSync API
   */
  readonly domainName: string | null;
}

/**
 * AppSync caller identity
 */
export interface AppSyncIdentity {
  /**
   * Unique identifier for the caller
   */
  readonly sub: string;

  /**
   * Issuer of the identity token
   */
  readonly issuer: string;

  /**
   * Username of the caller
   */
  readonly username: string;

  /**
   * Claims from the identity token
   */
  readonly claims: Record<string, unknown>;

  /**
   * Source IP address of the caller
   */
  readonly sourceIp: string[];

  /**
   * Default authorization strategy
   */
  readonly defaultAuthStrategy: string;
}

/**
 * Previous resolver result in pipeline
 */
export interface AppSyncPreviousResult {
  /**
   * Result from the previous resolver
   */
  readonly result: unknown;
}

/**
 * Backend HelloResponse from the Quarkus service
 */
export interface HelloResponse {
  /**
   * Message from the backend
   */
  readonly message: string;

  /**
   * Timestamp from the backend in ISO 8601 format
   */
  readonly timestamp: string;
}

/**
 * GraphQL error response structure
 */
export interface GraphQLError {
  /**
   * Error message
   */
  readonly message: string;

  /**
   * Error type/code
   */
  readonly errorType?: string;

  /**
   * Additional error information
   */
  readonly errorInfo?: Record<string, unknown>;
}

/**
 * Type guard to check if value is an Error object
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard to check if value is a HelloResponse
 */
export function isHelloResponse(value: unknown): value is HelloResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    'timestamp' in value &&
    typeof (value as HelloResponse).message === 'string' &&
    typeof (value as HelloResponse).timestamp === 'string'
  );
}
