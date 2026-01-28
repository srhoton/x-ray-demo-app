# X-Ray Resolver - AppSync Lambda Resolver with OpenTelemetry

This is a TypeScript-based AWS Lambda function that serves as an AppSync direct resolver. It demonstrates distributed tracing with AWS X-Ray by propagating trace context from AppSync through to a backend ALB endpoint.

## Overview

The resolver:
- Accepts AppSync Direct Lambda Resolver events
- Makes HTTPS requests to a backend ALB endpoint
- Propagates X-Ray trace context using OpenTelemetry
- Returns GraphQL-formatted responses
- Handles errors gracefully

## Architecture

```
Client → AppSync GraphQL API → Lambda Resolver → ALB → Backend Lambda
                ↓                      ↓             ↓          ↓
           (X-Ray Trace)        (Propagate)    (Forward)  (Continue)
```

## Requirements

- Node.js 20.x or higher
- npm or yarn
- AWS Lambda execution environment

## Installation

```bash
npm install
```

## Build

Build the Lambda deployment package:

```bash
npm run build
npm run package
```

This creates `dist/function.zip` ready for deployment.

## Testing

Run unit tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Configuration

The resolver requires the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `ALB_ENDPOINT` | Backend ALB endpoint URL | `https://example.alb.amazonaws.com` |
| `API_PATH` | API path to call on the ALB | `/api/hello` |
| `AWS_REGION` | AWS region (auto-set by Lambda) | `us-west-2` |
| `_X_AMZN_TRACE_ID` | X-Ray trace ID (auto-set by Lambda) | `Root=1-...` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry exporter endpoint (optional) | `http://localhost:4317` |

## OpenTelemetry X-Ray Tracing

This resolver uses OpenTelemetry with the AWS X-Ray exporter and propagator:

### Key Components

1. **Tracer Initialization** (`src/tracing.ts`)
   - Configures OpenTelemetry SDK with X-Ray propagator
   - Sets up auto-instrumentation for Node.js and AWS Lambda
   - Configures OTLP exporter for sending traces to X-Ray

2. **HTTP Client** (`src/client.ts`)
   - Makes instrumented HTTPS requests to the backend
   - Propagates X-Ray trace context via `X-Amzn-Trace-Id` header
   - Creates subsegments for HTTP calls

3. **Handler** (`src/index.ts`)
   - Main Lambda handler function
   - Creates spans for resolver operations
   - Records errors and exceptions in traces

### Trace Flow

1. AppSync creates initial X-Ray trace segment
2. Lambda receives trace context via `_X_AMZN_TRACE_ID` environment variable
3. OpenTelemetry SDK extracts trace context using X-Ray propagator
4. HTTP client propagates context to backend via `X-Amzn-Trace-Id` header
5. Backend continues the trace (if instrumented)
6. Complete trace visible in AWS X-Ray console

## GraphQL Schema

The resolver supports the following GraphQL query:

```graphql
type Query {
  getHello: HelloResponse
}

type HelloResponse {
  message: String!
  timestamp: String!
}
```

## Error Handling

The resolver returns GraphQL errors in the following format:

```typescript
{
  message: string
  errorType: string  // e.g., "BackendError", "InternalError"
  errorInfo?: {      // Optional additional context
    statusCode?: number
    body?: string
  }
}
```

### Error Types

- `InvalidField` - Unsupported GraphQL field name
- `BackendError` - Error from backend ALB call
- `InternalError` - Generic internal errors

## Development

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## Deployment

This Lambda function is deployed via Terraform. See `../terraform/resolver-lambda.tf` for deployment configuration.

### Manual Deployment

If deploying manually:

1. Build and package: `npm run package`
2. Upload `dist/function.zip` to AWS Lambda
3. Set handler to `index.handler`
4. Configure environment variables
5. Enable X-Ray tracing (PassThrough or Active)
6. Attach to AppSync as a data source

## Project Structure

```
x-ray-resolver/
├── src/
│   ├── index.ts           # Main Lambda handler
│   ├── types.ts           # TypeScript type definitions
│   ├── tracing.ts         # OpenTelemetry configuration
│   ├── client.ts          # HTTP client with X-Ray
│   └── __tests__/
│       └── index.test.ts  # Unit tests
├── dist/                  # Build output (gitignored)
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Test configuration
├── .gitignore
└── README.md
```

## Dependencies

### Production Dependencies
- `@opentelemetry/api` - OpenTelemetry API
- `@opentelemetry/sdk-node` - OpenTelemetry SDK for Node.js
- `@opentelemetry/auto-instrumentations-node` - Auto-instrumentation
- `@opentelemetry/instrumentation-aws-lambda` - Lambda instrumentation
- `@opentelemetry/instrumentation-http` - HTTP instrumentation
- `@opentelemetry/propagator-aws-xray` - X-Ray trace propagator
- `@opentelemetry/exporter-trace-otlp-grpc` - OTLP exporter

### Development Dependencies
- `typescript` - TypeScript compiler
- `vitest` - Testing framework
- `esbuild` - Bundler for Lambda deployment
- `eslint` - Linting
- `prettier` - Code formatting

## License

MIT
