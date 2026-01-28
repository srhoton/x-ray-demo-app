/**
 * Structured logging utility with X-Ray trace context
 *
 * This module provides logging functions that automatically include
 * X-Ray trace IDs in the log output, enabling log correlation in
 * the X-Ray console.
 */

import { trace, context } from '@opentelemetry/api';

/**
 * Log level enum
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Structured log entry
 *
 * Uses AWS X-Ray expected field names for log correlation:
 * - xray_trace_id: The X-Ray trace ID in 1-{timestamp}-{id} format
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  xray_trace_id?: string;
  span_id?: string;
  [key: string]: unknown;
}

/**
 * Get the current X-Ray trace ID from OpenTelemetry context
 *
 * @returns X-Ray formatted trace ID or undefined if no active span
 */
function getXRayTraceId(): string | undefined {
  const span = trace.getSpan(context.active());
  if (!span) {
    return undefined;
  }

  const spanContext = span.spanContext();
  if (!spanContext || !spanContext.traceId) {
    return undefined;
  }

  // Convert OpenTelemetry trace ID to X-Ray format
  // OpenTelemetry uses 32-character hex string
  // X-Ray format: 1-{timestamp}-{trace-id}
  // Extract timestamp (first 8 hex chars) and id (remaining 24 hex chars)
  const otelTraceId = spanContext.traceId;
  const timestamp = otelTraceId.substring(0, 8);
  const traceIdPart = otelTraceId.substring(8);

  return `1-${timestamp}-${traceIdPart}`;
}

/**
 * Get the current span ID
 *
 * @returns Span ID or undefined if no active span
 */
function getSpanId(): string | undefined {
  const span = trace.getSpan(context.active());
  return span?.spanContext()?.spanId;
}

/**
 * Create a structured log entry
 *
 * @param level - Log level
 * @param message - Log message
 * @param metadata - Additional metadata to include
 * @returns Structured log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>,
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  // Add trace context if available using AWS X-Ray expected field names
  const traceId = getXRayTraceId();
  if (traceId) {
    entry.xray_trace_id = traceId;
  }

  const spanId = getSpanId();
  if (spanId) {
    entry.span_id = spanId;
  }

  return entry;
}

/**
 * Write a log entry directly to stdout as pure JSON
 * Using process.stdout.write avoids Lambda's log prefix that console.log adds
 *
 * @param entry - The log entry to write
 */
function writeLog(entry: LogEntry): void {
  process.stdout.write(JSON.stringify(entry) + '\n');
}

/**
 * Log a message with DEBUG level
 *
 * @param message - Log message
 * @param metadata - Additional metadata
 */
export function debug(message: string, metadata?: Record<string, unknown>): void {
  const entry = createLogEntry(LogLevel.DEBUG, message, metadata);
  writeLog(entry);
}

/**
 * Log a message with INFO level
 *
 * @param message - Log message
 * @param metadata - Additional metadata
 */
export function info(message: string, metadata?: Record<string, unknown>): void {
  const entry = createLogEntry(LogLevel.INFO, message, metadata);
  writeLog(entry);
}

/**
 * Log a message with WARN level
 *
 * @param message - Log message
 * @param metadata - Additional metadata
 */
export function warn(message: string, metadata?: Record<string, unknown>): void {
  const entry = createLogEntry(LogLevel.WARN, message, metadata);
  writeLog(entry);
}

/**
 * Log a message with ERROR level
 *
 * @param message - Log message
 * @param error - Error object or metadata
 */
export function error(message: string, error?: Error | Record<string, unknown>): void {
  const metadata: Record<string, unknown> =
    error instanceof Error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : error ?? {};

  const entry = createLogEntry(LogLevel.ERROR, message, metadata);
  writeLog(entry);
}
