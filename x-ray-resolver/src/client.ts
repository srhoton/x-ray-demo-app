/**
 * HTTP client for calling the backend ALB
 *
 * X-Ray tracing is handled automatically by the ADOT Node.js
 * auto-instrumentation layer which instruments https.request() calls.
 */

import * as https from 'https';
import type { HelloResponse } from './types';
import { isHelloResponse } from './types';
import * as logger from './logger';

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
 * Call the backend ALB endpoint
 *
 * X-Ray tracing is handled automatically by the ADOT auto-instrumentation
 * layer which instruments the https.request() call.
 *
 * @param config - HTTP client configuration
 * @returns Promise resolving to HelloResponse
 * @throws {BackendError} When the backend request fails
 */
export async function callBackend(config: ClientConfig): Promise<HelloResponse> {
  const timeout = config.timeout ?? 30000;
  const url = new URL(config.endpoint);

  const options: https.RequestOptions = {
    hostname: url.hostname,
    port: url.port || 443,
    path: config.path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'x-ray-resolver/1.0',
    },
    timeout,
    // Allow self-signed certificates for internal ALB communication within VPC
    rejectUnauthorized: false,
  };

  logger.debug('Calling backend ALB', {
    endpoint: config.endpoint,
    path: config.path,
    timeout,
  });

  return new Promise<HelloResponse>((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });

      res.on('end', () => {
        const statusCode = res.statusCode ?? 0;

        if (statusCode >= 200 && statusCode < 300) {
          try {
            const parsed: unknown = JSON.parse(data);

            if (!isHelloResponse(parsed)) {
              logger.error('Invalid backend response format', {
                statusCode,
                body: data.substring(0, 200),
              });
              reject(new BackendError('Invalid response format', statusCode, data));
              return;
            }

            logger.debug('Backend call successful', { statusCode });
            resolve(parsed);
          } catch (error) {
            logger.error('Failed to parse backend response', error instanceof Error ? error : new Error(String(error)));
            reject(
              new BackendError(
                `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown'}`,
                statusCode,
                data,
              ),
            );
          }
        } else {
          logger.error('Backend returned error status', {
            statusCode,
            body: data.substring(0, 200),
          });
          reject(new BackendError(`Backend error: ${statusCode}`, statusCode, data));
        }
      });
    });

    req.on('error', (error: Error) => {
      logger.error('Network error calling backend', error);
      reject(new BackendError(`Network error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      logger.error('Backend call timed out', { timeout });
      reject(new BackendError(`Timeout after ${timeout}ms`));
    });

    req.end();
  });
}
