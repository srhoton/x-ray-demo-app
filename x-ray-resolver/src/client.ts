/**
 * HTTP client for calling the backend ALB with X-Ray tracing
 */

import * as https from 'https';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import type { HelloResponse } from './types';
import { isHelloResponse } from './types';
import { getXRayTraceId } from './tracing';

/**
 * Configuration for the HTTP client
 */
export interface ClientConfig {
  /**
   * ALB endpoint URL (e.g., https://example.com)
   */
  readonly endpoint: string;

  /**
   * API path to call (e.g., /api/hello)
   */
  readonly path: string;

  /**
   * Request timeout in milliseconds
   */
  readonly timeout?: number;
}

/**
 * Error thrown when the backend request fails
 */
export class BackendError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

/**
 * Call the backend ALB endpoint with X-Ray tracing
 *
 * @param config - HTTP client configuration
 * @returns Promise resolving to HelloResponse
 * @throws {BackendError} When the backend request fails
 */
export async function callBackend(config: ClientConfig): Promise<HelloResponse> {
  const tracer = trace.getTracer('x-ray-resolver-client');
  const timeout = config.timeout ?? 30000;

  return tracer.startActiveSpan('CallBackendALB', async (span) => {
    try {
      // Add span attributes
      span.setAttribute('http.method', 'GET');
      span.setAttribute('http.url', `${config.endpoint}${config.path}`);
      span.setAttribute('peer.service', 'backend-alb');

      // Get X-Ray trace ID for propagation
      const traceId = getXRayTraceId();
      if (traceId) {
        span.setAttribute('aws.xray.trace_id', traceId);
      }

      // Parse the endpoint URL
      const url = new URL(config.endpoint);
      const fullPath = config.path;

      // Prepare request options
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: fullPath,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'x-ray-resolver/1.0',
        },
        timeout,
      };

      // Add X-Ray trace header if available
      if (traceId) {
        options.headers = {
          ...options.headers,
          'X-Amzn-Trace-Id': traceId,
        };
      }

      // Make the HTTPS request
      const response = await new Promise<HelloResponse>((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk: Buffer) => {
            data += chunk.toString();
          });

          res.on('end', () => {
            const statusCode = res.statusCode ?? 0;
            span.setAttribute('http.status_code', statusCode);

            if (statusCode >= 200 && statusCode < 300) {
              try {
                const parsed: unknown = JSON.parse(data);

                // Validate response structure
                if (!isHelloResponse(parsed)) {
                  reject(
                    new BackendError(
                      'Invalid response format from backend',
                      statusCode,
                      data,
                    ),
                  );
                  return;
                }

                resolve(parsed);
              } catch (error) {
                reject(
                  new BackendError(
                    `Failed to parse backend response: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    statusCode,
                    data,
                  ),
                );
              }
            } else {
              reject(
                new BackendError(
                  `Backend returned error status: ${statusCode}`,
                  statusCode,
                  data,
                ),
              );
            }
          });
        });

        req.on('error', (error: Error) => {
          reject(new BackendError(`Network error: ${error.message}`));
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new BackendError(`Request timeout after ${timeout}ms`));
        });

        req.end();
      });

      // Mark span as successful
      span.setStatus({ code: SpanStatusCode.OK });
      return response;
    } catch (error) {
      // Record error in span
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error) {
        span.recordException(error);
      }

      throw error;
    } finally {
      span.end();
    }
  });
}
