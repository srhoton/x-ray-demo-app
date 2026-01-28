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
    region: string;
    sessionSampleRate: number;
    telemetries: string[];
    enableXRay: boolean;
  };
}

// These will be replaced by Terraform during build
const config: AppConfig = {
  appsync: {
    url:
      import.meta.env.VITE_APPSYNC_URL ||
      'https://ju4yjdc2incctntbc3lvlq4fdi.appsync-api.us-west-2.amazonaws.com/graphql',
    apiKey: import.meta.env.VITE_APPSYNC_API_KEY || '__PLACEHOLDER__',
    region: import.meta.env.VITE_AWS_REGION || 'us-west-2',
  },
  rum: {
    applicationId: import.meta.env.VITE_RUM_APP_ID || '__PLACEHOLDER__',
    applicationVersion: '1.0.0',
    identityPoolId:
      import.meta.env.VITE_RUM_IDENTITY_POOL_ID || '__PLACEHOLDER__',
    region: import.meta.env.VITE_AWS_REGION || 'us-west-2',
    sessionSampleRate: 1.0, // 100% sampling for demo
    telemetries: ['errors', 'performance', 'http'],
    enableXRay: true,
  },
};

export default config;
