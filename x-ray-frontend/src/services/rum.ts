/**
 * CloudWatch RUM (Real User Monitoring) initialization
 * Provides distributed tracing integration with AWS X-Ray
 */

import { AwsRum, AwsRumConfig } from 'aws-rum-web';
import config from '../config';

let rumClient: AwsRum | null = null;

/**
 * Initialize CloudWatch RUM client with X-Ray integration
 * This should be called once at application startup
 */
export function initializeRUM(): AwsRum | null {
  // Skip initialization if already initialized
  if (rumClient !== null) {
    return rumClient;
  }

  // Skip initialization if required config is missing
  if (
    config.rum.applicationId === '__PLACEHOLDER__' ||
    config.rum.identityPoolId === '__PLACEHOLDER__'
  ) {
    console.warn('CloudWatch RUM not initialized: missing configuration');
    return null;
  }

  try {
    const rumConfig: AwsRumConfig = {
      sessionSampleRate: config.rum.sessionSampleRate,
      identityPoolId: config.rum.identityPoolId,
      endpoint: `https://dataplane.rum.${config.rum.region}.amazonaws.com`,
      telemetries: config.rum.telemetries,
      allowCookies: true,
      enableXRay: config.rum.enableXRay,
    };

    rumClient = new AwsRum(
      config.rum.applicationId,
      config.rum.applicationVersion,
      config.rum.region,
      rumConfig
    );

    console.log('CloudWatch RUM initialized successfully');
    return rumClient;
  } catch (error) {
    console.error('Failed to initialize CloudWatch RUM:', error);
    return null;
  }
}

/**
 * Get the RUM client instance
 * Returns null if RUM is not initialized
 */
export function getRUM(): AwsRum | null {
  return rumClient;
}

/**
 * Record a custom event in CloudWatch RUM
 */
export function recordEvent(
  eventType: string,
  eventData?: Record<string, unknown>
): void {
  if (rumClient === null) {
    return;
  }

  try {
    if (eventData !== undefined) {
      rumClient.recordEvent(eventType, eventData);
    } else {
      rumClient.recordEvent(eventType, {});
    }
  } catch (error) {
    console.error('Failed to record RUM event:', error);
  }
}

/**
 * Record an error in CloudWatch RUM
 */
export function recordError(error: Error): void {
  if (rumClient === null) {
    return;
  }

  try {
    rumClient.recordError(error);
  } catch (recordingError) {
    console.error('Failed to record RUM error:', recordingError);
  }
}
