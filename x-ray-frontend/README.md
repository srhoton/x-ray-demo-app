# X-Ray Frontend

React frontend application with AWS CloudWatch RUM integration for distributed tracing demo.

## Overview

This is a simple React SPA that demonstrates end-to-end distributed tracing with AWS X-Ray. The application calls the AppSync GraphQL API, which triggers a chain of Lambda functions, all instrumented for X-Ray tracing.

### Architecture

```
User Browser
    ↓
CloudWatch RUM (captures user interactions)
    ↓
React App (this application)
    ↓
AppSync GraphQL API
    ↓
Lambda Resolver
    ↓
Backend Lambda
```

## Features

- **React 18** with TypeScript and functional components
- **CloudWatch RUM** integration for real user monitoring
- **X-Ray Tracing** end-to-end from browser to backend
- **AppSync GraphQL** client for API calls
- **Tailwind CSS** for styling
- **Vite** for fast development and optimized builds

## Prerequisites

- Node.js 18+
- npm or yarn
- AWS Account with:
  - AppSync API deployed
  - CloudWatch RUM App Monitor configured
  - Cognito Identity Pool for anonymous access

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The application will open at http://localhost:3000

### Build

Create a production build:

```bash
npm run build
```

Build output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Configuration

The application is configured via environment variables at build time. These are typically injected by Terraform during deployment.

### Environment Variables

- `VITE_APPSYNC_URL` - AppSync GraphQL API endpoint
- `VITE_APPSYNC_API_KEY` - AppSync API key
- `VITE_AWS_REGION` - AWS region (default: us-west-2)
- `VITE_RUM_APP_ID` - CloudWatch RUM Application ID
- `VITE_RUM_IDENTITY_POOL_ID` - Cognito Identity Pool ID

### Example `.env.local`

For local development, create a `.env.local` file:

```env
VITE_APPSYNC_URL=https://your-api-id.appsync-api.us-west-2.amazonaws.com/graphql
VITE_APPSYNC_API_KEY=da2-xxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=us-west-2
VITE_RUM_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_RUM_IDENTITY_POOL_ID=us-west-2:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## Project Structure

```
x-ray-frontend/
├── src/
│   ├── components/         # React components
│   │   └── HelloButton.tsx
│   ├── services/          # API and monitoring services
│   │   ├── appsync.ts     # AppSync GraphQL client
│   │   └── rum.ts         # CloudWatch RUM initialization
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── __tests__/         # Test files
│   ├── App.tsx            # Main App component
│   ├── main.tsx           # Application entry point
│   ├── config.ts          # Configuration
│   ├── index.css          # Global styles
│   └── vite-env.d.ts      # Vite environment types
├── public/                # Static assets
├── index.html             # HTML template
├── package.json
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
├── vitest.config.ts       # Vitest test configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── README.md
```

## Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Code Quality

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## Deployment

The application is deployed via Terraform, which:

1. Builds the React application
2. Uploads artifacts to S3
3. Serves the app via CloudFront
4. Configures custom domain (xray.sb.fullbay.com)

See the main project README for deployment instructions.

## CloudWatch RUM

The application uses CloudWatch RUM for:

- **User session tracking** - Monitor user interactions
- **Performance metrics** - Page load times, API latency
- **Error tracking** - JavaScript errors and exceptions
- **X-Ray integration** - Propagate traces from browser to backend

### Viewing Traces

1. Navigate to AWS X-Ray Console
2. Select "Service map" to visualize the architecture
3. Select "Traces" to view individual request traces
4. Filter by service name or trace ID

### Viewing RUM Data

1. Navigate to CloudWatch RUM Console
2. Select the application monitor
3. View dashboards for:
   - User sessions
   - Performance metrics
   - Errors and exceptions
   - Custom events

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **AWS RUM Web SDK** - Real user monitoring
- **Vitest** - Unit testing framework

## License

See main project LICENSE

## Support

For issues or questions, see the main project README.
