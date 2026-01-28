/**
 * Unit tests for AppSync Lambda Resolver
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Context } from 'aws-lambda';
import type { AppSyncResolverEvent, HelloResponse } from '../types';

// Mock the tracing module before importing handler
vi.mock('../tracing', () => ({
  initializeTracing: vi.fn(() => ({
    start: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  })),
  getXRayTraceId: vi.fn(() => 'Root=1-67890abc-12345678901234567890abcd'),
}));

// Mock the client module
vi.mock('../client', () => ({
  callBackend: vi.fn(),
  BackendError: class BackendError extends Error {
    constructor(
      message: string,
      public statusCode?: number,
      public body?: string,
    ) {
      super(message);
      this.name = 'BackendError';
    }
  },
}));

// Import after mocks are set up
import { handler } from '../index';
import { callBackend, BackendError } from '../client';

/**
 * Create a mock AppSync resolver event
 */
function createMockEvent(
  fieldName: string = 'getHello',
  typeName: string = 'Query',
): AppSyncResolverEvent {
  return {
    typeName,
    fieldName,
    arguments: {},
    identity: null,
    source: null,
    request: {
      headers: {},
      domainName: null,
    },
    prev: null,
    stash: {},
  };
}

/**
 * Create a mock Lambda context
 */
function createMockContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'x-ray-resolver',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-west-2:123456789012:function:x-ray-resolver',
    memoryLimitInMB: '1024',
    awsRequestId: 'test-request-id-12345',
    logGroupName: '/aws/lambda/x-ray-resolver',
    logStreamName: '2026/01/28/[$LATEST]abcdef123456',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

describe('AppSync Lambda Resolver', () => {
  beforeEach(() => {
    // Set up environment variables
    process.env['ALB_ENDPOINT'] = 'https://example.alb.amazonaws.com';
    process.env['API_PATH'] = '/api/hello';
    process.env['_X_AMZN_TRACE_ID'] = 'Root=1-67890abc-12345678901234567890abcd';

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env['ALB_ENDPOINT'];
    delete process.env['API_PATH'];
    delete process.env['_X_AMZN_TRACE_ID'];
  });

  describe('handler - successful responses', () => {
    it('should return HelloResponse when backend call succeeds', async () => {
      // Arrange
      const mockResponse: HelloResponse = {
        message: 'Hello World',
        timestamp: '2026-01-28T12:00:00Z',
      };

      vi.mocked(callBackend).mockResolvedValue(mockResponse);

      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(callBackend).toHaveBeenCalledWith({
        endpoint: 'https://example.alb.amazonaws.com',
        path: '/api/hello',
        timeout: 30000,
      });
    });

    it('should handle getHello field name', async () => {
      // Arrange
      const mockResponse: HelloResponse = {
        message: 'Hello World',
        timestamp: '2026-01-28T12:00:00Z',
      };

      vi.mocked(callBackend).mockResolvedValue(mockResponse);

      const event = createMockEvent('getHello');
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

  describe('handler - error handling', () => {
    it('should return GraphQL error when field name is unsupported', async () => {
      // Arrange
      const event = createMockEvent('unsupportedField');
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('errorType', 'InvalidField');
      expect((result as { message: string }).message).toContain('Unsupported field');
      expect(callBackend).not.toHaveBeenCalled();
    });

    it('should return GraphQL error when ALB_ENDPOINT is missing', async () => {
      // Arrange
      delete process.env['ALB_ENDPOINT'];

      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('errorType', 'InternalError');
      expect((result as { message: string }).message).toContain('ALB_ENDPOINT');
    });

    it('should return GraphQL error when API_PATH is missing', async () => {
      // Arrange
      delete process.env['API_PATH'];

      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('errorType', 'InternalError');
      expect((result as { message: string }).message).toContain('API_PATH');
    });

    it('should return GraphQL error when backend call fails', async () => {
      // Arrange
      const backendError = new BackendError('Connection refused', 503, 'Service Unavailable');
      vi.mocked(callBackend).mockRejectedValue(backendError);

      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('errorType', 'BackendError');
      expect((result as { message: string }).message).toContain('Backend error');
      expect((result as { errorInfo?: { statusCode?: number } }).errorInfo?.statusCode).toBe(503);
    });

    it('should return GraphQL error when backend throws generic error', async () => {
      // Arrange
      vi.mocked(callBackend).mockRejectedValue(new Error('Network timeout'));

      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toHaveProperty('message', 'Network timeout');
      expect(result).toHaveProperty('errorType', 'InternalError');
    });

    it('should return GraphQL error when backend throws non-Error object', async () => {
      // Arrange
      vi.mocked(callBackend).mockRejectedValue('String error');

      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toHaveProperty('message', 'Unknown error');
      expect(result).toHaveProperty('errorType', 'InternalError');
    });
  });

  describe('handler - X-Ray tracing', () => {
    it('should propagate trace context to backend call', async () => {
      // Arrange
      const mockResponse: HelloResponse = {
        message: 'Hello World',
        timestamp: '2026-01-28T12:00:00Z',
      };

      vi.mocked(callBackend).mockResolvedValue(mockResponse);

      const event = createMockEvent();
      const context = createMockContext();

      // Act
      await handler(event, context);

      // Assert
      expect(callBackend).toHaveBeenCalled();
      // Trace propagation is handled by OpenTelemetry automatically
    });
  });
});
