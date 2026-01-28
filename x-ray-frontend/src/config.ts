/**
 * Application configuration
 * Values are injected at build time by Terraform
 */

export interface AppConfig {
  appsync: {
    url: string;
    apiKey: string;
    region: string;
  };
  rum: {
    applicationId: string;
    applicationVersion: string;
    identityPoolId: string;
    guestRoleArn: string;
    region: string;
    sessionSampleRate: number;
    telemetries: string[];
    enableXRay: boolean;
  };
}

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: keyof ImportMetaEnv, fallback: string): string {
  return import.meta.env[key] ?? fallback;
}

// These will be replaced by Terraform during build
const config: AppConfig = {
  appsync: {
    url: getEnvVar(
      'VITE_APPSYNC_URL',
      'https://ju4yjdc2incctntbc3lvlq4fdi.appsync-api.us-west-2.amazonaws.com/graphql',
    ),
    apiKey: getEnvVar('VITE_APPSYNC_API_KEY', '__PLACEHOLDER__'),
    region: getEnvVar('VITE_AWS_REGION', 'us-west-2'),
  },
  rum: {
    applicationId: getEnvVar('VITE_RUM_APP_ID', '__PLACEHOLDER__'),
    applicationVersion: '1.0.0',
    identityPoolId: getEnvVar('VITE_RUM_IDENTITY_POOL_ID', '__PLACEHOLDER__'),
    guestRoleArn: getEnvVar('VITE_RUM_GUEST_ROLE_ARN', '__PLACEHOLDER__'),
    region: getEnvVar('VITE_AWS_REGION', 'us-west-2'),
    sessionSampleRate: 1.0, // 100% sampling for demo
    telemetries: ['errors', 'performance', 'http'],
    enableXRay: true,
  },
};

export default config;
