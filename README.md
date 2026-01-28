# AWS X-Ray Demo Application

A comprehensive demonstration of end-to-end AWS X-Ray distributed tracing from browser to backend using CloudWatch RUM, AppSync, and OpenTelemetry.

## Overview

This project showcases modern AWS serverless architecture with complete distributed tracing:

- **Frontend**: React 18 SPA with CloudWatch RUM instrumentation
- **API Gateway**: AWS AppSync GraphQL API
- **Resolvers**: Node.js Lambda with OpenTelemetry tracing
- **Backend**: Quarkus Java 21 Lambda function with REST API
- **Tracing**: End-to-end OpenTelemetry integration with AWS X-Ray
- **Infrastructure**: Terraform IaC for automated deployment
- **Hosting**: CloudFront CDN with S3, custom domain, and HTTPS

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          AWS Cloud (us-west-2)                    │
│                                                                    │
│  User Browser                                                      │
│       ↓                                                           │
│  CloudWatch RUM (captures user interactions & traces)             │
│       ↓                                                           │
│  CloudFront (xray.sb.fullbay.com) ──> S3 (React SPA)             │
│       ↓                                                           │
│  AppSync GraphQL API (X-Ray enabled)                              │
│       ↓                                                           │
│  Lambda Resolver (Node.js + OpenTelemetry)                        │
│       ↓                                                           │
│  ALB (HTTPS Listener) ──> Lambda Backend (Quarkus + OpenTelemetry)│
│       ↓                                                           │
│  AWS X-Ray (complete distributed trace visualization)             │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
x-ray-demo-app/
├── README.md                       # This file
├── sdlc-plan.md                    # SDLC orchestration plan
├── x-ray-frontend/                 # React frontend application
│   ├── src/                        # React source code
│   ├── package.json                # Node.js dependencies
│   └── README.md                   # Frontend documentation
├── x-ray-resolver/                 # AppSync Lambda resolver
│   ├── src/                        # TypeScript source code
│   ├── package.json                # Node.js dependencies
│   └── README.md                   # Resolver documentation
├── x-ray-backend/                  # Quarkus Lambda application
│   ├── src/                        # Java source code
│   ├── build.gradle                # Gradle build configuration
│   ├── gradlew                     # Gradle wrapper
│   └── README.md                   # Backend documentation
└── terraform/                      # Infrastructure as Code
    ├── *.tf                        # Terraform configuration files
    ├── terraform.tfvars.example    # Example configuration
    └── README.md                   # Terraform documentation
```

## Quick Start

### Prerequisites

- Node.js 18+ (for frontend and resolver)
- Java 21 (for backend)
- Terraform >= 1.5.0
- AWS CLI configured with credentials
- Existing AWS infrastructure:
  - VPC with private subnets tagged `tier=private`
  - Application Load Balancer with HTTPS listener
  - Route53 hosted zone (sb.fullbay.com)

### 1. Build the Backend

```bash
cd x-ray-backend
./gradlew clean build
```

This creates the Lambda deployment package at `build/quarkus-app/`.

### 2. Deploy Infrastructure

```bash
cd ../terraform

# Create your configuration
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your AWS details

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Deploy
terraform apply
```

### 3. Test the Deployment

Open your browser and navigate to:
```
https://xray.sb.fullbay.com
```

Click the "Call getHello" button to trigger a traced request through the entire system.

Alternatively, test the backend API directly:
```bash
# Test AppSync API
APPSYNC_URL=$(terraform output -raw appsync_api_url)
APPSYNC_KEY=$(terraform output -raw appsync_api_key)

curl -X POST "$APPSYNC_URL" \
  -H "x-api-key: $APPSYNC_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ getHello { message timestamp } }"}'
```

### 4. View X-Ray Traces

1. Navigate to AWS X-Ray Console
2. Select "Service map" to visualize the architecture
3. Select "Traces" to view individual request traces
4. Filter by service name: `x-ray-backend`

## Components

### Frontend Application (`x-ray-frontend/`)

A React SPA with CloudWatch RUM integration:

- **UI**: Simple button interface to trigger traced requests
- **CloudWatch RUM**: Browser-side monitoring and X-Ray integration
- **GraphQL Client**: Direct integration with AppSync API
- **TypeScript**: Strict type checking for reliability
- **Testing**: Vitest unit tests
- **Styling**: Tailwind CSS utility-first styling

**Key Technologies**:
- React 18
- TypeScript 5.3
- Vite 5.0
- AWS CloudWatch RUM Web SDK
- Tailwind CSS 3.4

**See**: [x-ray-frontend/README.md](x-ray-frontend/README.md)

### AppSync Resolver (`x-ray-resolver/`)

A Node.js Lambda resolver for AppSync:

- **GraphQL Resolution**: Handles AppSync query resolution
- **OpenTelemetry**: Propagates X-Ray traces
- **HTTP Client**: Calls backend Lambda via ALB
- **TypeScript**: Type-safe GraphQL operations

**Key Technologies**:
- Node.js 20
- TypeScript
- OpenTelemetry SDK
- AWS SDK v3

**See**: [x-ray-resolver/README.md](x-ray-resolver/README.md)

### Backend Application (`x-ray-backend/`)

A Quarkus-based Lambda function with:

- **REST API**: Single endpoint `/api/hello` returning JSON
- **OpenTelemetry**: Modern tracing instrumentation for X-Ray
- **Testing**: Comprehensive unit tests with 80%+ coverage
- **Code Quality**: Spotless formatting, Google Java Style
- **Documentation**: Complete README with usage examples

**Key Technologies**:
- Quarkus 3.17.4
- Java 21
- Gradle 8.11.1
- OpenTelemetry SDK
- JUnit 5, RestAssured

**See**: [x-ray-backend/README.md](x-ray-backend/README.md)

### Infrastructure (`terraform/`)

Terraform configuration for complete AWS deployment:

- **Frontend Hosting**: S3 bucket, CloudFront distribution, Route53 DNS
- **SSL/TLS**: ACM certificate for HTTPS
- **CloudWatch RUM**: App monitor and Cognito identity pool
- **AppSync API**: GraphQL API with Lambda data source
- **Lambda Functions**: Resolver and backend with VPC integration
- **IAM Roles**: Least-privilege execution roles
- **ALB Integration**: Target group and listener rule
- **Security**: Security groups, bucket policies, OAI
- **Monitoring**: CloudWatch Logs and X-Ray tracing

**Key Features**:
- Automated React build and deployment
- CloudFront cache invalidation
- DNS certificate validation
- X-Ray tracing throughout
- Configurable via variables

**See**: [terraform/README.md](terraform/README.md)

## Configuration

### Backend Configuration

Key settings in `x-ray-backend/src/main/resources/application.properties`:

```properties
# OpenTelemetry X-Ray Configuration
quarkus.otel.exporter.otlp.endpoint=http://localhost:4317
quarkus.otel.traces.exporter=otlp
quarkus.otel.propagators=tracecontext,baggage
quarkus.otel.traces.sampler=parentbased_traceidratio
```

### Infrastructure Configuration

Key variables in `terraform/terraform.tfvars`:

```hcl
aws_region           = "us-west-2"
environment          = "dev"
lambda_function_name = "x-ray-backend"
lambda_memory_size   = 1024
lambda_timeout       = 60
api_path_pattern     = "/api/hello"
enable_xray_tracing  = true
xray_tracing_mode    = "PassThrough"
```

## OpenTelemetry & X-Ray Integration

This project uses **OpenTelemetry** (the modern standard) instead of the deprecated AWS X-Ray SDK.

### Key Differences

| Feature | This Project (OpenTelemetry) | Deprecated X-Ray SDK |
|---------|------------------------------|---------------------|
| Standard | Open standard (CNCF) | AWS proprietary |
| Flexibility | Multiple backends | X-Ray only |
| Instrumentation | Automatic + manual | Mostly manual |
| Future Support | Active development | Deprecated |
| Vendor Lock-in | None | AWS only |

### Configuration

The Lambda function is configured with:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:2000
OTEL_TRACES_SAMPLER=xray
OTEL_PROPAGATORS=tracecontext,baggage,xray
```

### Tracing Mode

**PassThrough** mode (configured in Terraform):
- Lambda propagates trace context from ALB
- Maintains end-to-end tracing across services
- No additional sampling decisions at Lambda level

## Monitoring & Observability

### CloudWatch Logs

Lambda logs are automatically sent to CloudWatch:

```bash
aws logs tail /aws/lambda/x-ray-backend --follow
```

### X-Ray Service Map

View the service topology in X-Ray Console:
- ALB → Lambda → Downstream services
- Latency metrics and error rates
- Service dependencies

### X-Ray Traces

Individual request traces show:
- Request path through services
- Timing breakdown by component
- Annotations and metadata
- Errors and exceptions

## Development

### Local Development

```bash
cd x-ray-backend

# Run in development mode
./gradlew quarkusDev

# Test locally
curl http://localhost:8080/api/hello
```

### Running Tests

```bash
# Run all tests
./gradlew test

# Run tests with coverage
./gradlew test jacocoTestReport

# View results
open build/reports/tests/test/index.html
```

### Code Formatting

```bash
# Apply formatting
./gradlew spotlessApply

# Check formatting
./gradlew spotlessCheck
```

## Troubleshooting

### Lambda Not Receiving Requests

1. Check ALB listener rules
2. Verify target health in target group
3. Check Lambda permissions for ALB invocation
4. Review security group rules

### X-Ray Traces Not Appearing

1. Verify X-Ray tracing is enabled on Lambda
2. Check IAM role has X-Ray write permissions
3. Review OpenTelemetry configuration
4. Check CloudWatch Logs for errors

### Build Failures

```bash
# Clean build artifacts
./gradlew clean

# Rebuild
./gradlew build

# If Terraform build fails, build manually first
cd x-ray-backend && ./gradlew clean build && cd ../terraform
terraform apply
```

## Cost Considerations

Approximate monthly costs (us-west-2):

- **Lambda**: ~$0.20 per 1M requests (1GB memory, 1s avg duration)
  - Free tier: 1M requests/month
- **CloudWatch Logs**: $0.50/GB ingestion, $0.03/GB storage
- **X-Ray**: $5.00 per 1M traces recorded
  - Free tier: 100,000 traces/month
- **ALB**: Existing infrastructure (not included)

**Note**: Free tier applies to the first 12 months on new AWS accounts.

## Security

- **VPC Isolation**: Lambda deployed in private subnets
- **IAM Least Privilege**: Minimal required permissions
- **HTTPS Only**: All traffic encrypted in transit
- **No Secrets in Code**: Environment variables and AWS Secrets Manager
- **Security Groups**: Restrictive rules for Lambda

## Cleanup

To remove all deployed resources:

```bash
cd terraform
terraform destroy
```

**Note**: This will NOT destroy the existing VPC, ALB, or listener.

## Contributing

When making changes:

1. Ensure all tests pass: `./gradlew test`
2. Apply code formatting: `./gradlew spotlessApply`
3. Validate Terraform: `terraform validate`
4. Update documentation as needed
5. Test deployment in a non-production environment

## Additional Resources

- [Quarkus Amazon Lambda HTTP](https://quarkus.io/guides/amazon-lambda-http)
- [AWS Lambda with ALB](https://docs.aws.amazon.com/lambda/latest/dg/services-alb.html)
- [OpenTelemetry](https://opentelemetry.io/)
- [AWS X-Ray](https://docs.aws.amazon.com/xray/)
- [AWS Distro for OpenTelemetry](https://aws-otel.github.io/)

## License

[Your License Here]

## Support

For issues or questions:
- Check component-specific READMEs
- Review CloudWatch Logs
- Examine X-Ray traces
- See [sdlc-plan.md](sdlc-plan.md) for project structure

---

Built with ❤️ using Quarkus, OpenTelemetry, and Terraform
