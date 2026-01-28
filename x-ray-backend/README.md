# X-Ray Backend Service

A Quarkus-based AWS Lambda function that demonstrates AWS X-Ray tracing integration using OpenTelemetry. This service provides a simple REST API endpoint and is designed to be deployed behind an Application Load Balancer (ALB).

## Overview

This Lambda function:
- Accepts HTTP events from an Application Load Balancer
- Returns a JSON response with a greeting message and timestamp
- Automatically sends distributed traces to AWS X-Ray via OpenTelemetry
- Uses PassThrough tracing mode to propagate trace context from the ALB

## Prerequisites

- Java 21 or higher
- Gradle 8.11.1 or higher (wrapper included)
- AWS CLI configured with appropriate credentials (for deployment)
- Docker (optional, for local testing)

## Project Structure

```
x-ray-backend/
├── build.gradle                          # Gradle build configuration
├── settings.gradle                       # Gradle settings
├── gradle.properties                     # Quarkus and build properties
├── gradlew                               # Gradle wrapper (Unix)
├── gradlew.bat                           # Gradle wrapper (Windows)
├── src/
│   ├── main/
│   │   ├── java/com/example/xray/
│   │   │   ├── HelloResource.java       # REST endpoint
│   │   │   └── model/
│   │   │       └── HelloResponse.java   # Response model
│   │   └── resources/
│   │       └── application.properties   # Quarkus configuration
│   └── test/
│       └── java/com/example/xray/
│           └── HelloResourceTest.java   # Unit tests
└── README.md                             # This file
```

## Building the Application

### Using Gradle Wrapper (Recommended)

```bash
# Build the application
./gradlew build

# Run tests
./gradlew test

# Build without tests
./gradlew build -x test

# Clean and rebuild
./gradlew clean build
```

### Build Output

The build produces a Lambda-ready deployment package:
```
build/function.zip               # Lambda deployment package
build/quarkus-app/               # Quarkus application artifacts
```

## Running Tests

```bash
# Run all tests
./gradlew test

# Run tests with coverage
./gradlew test jacocoTestReport

# View test results
open build/reports/tests/test/index.html
```

## API Endpoints

### GET /api/hello

Returns a hello world message with timestamp.

**Response:**
```json
{
  "message": "Hello World",
  "timestamp": "2026-01-28T12:34:56.789Z"
}
```

**Status Codes:**
- `200 OK` - Successful response

## OpenTelemetry & X-Ray Configuration

This application uses Quarkus OpenTelemetry extension to send traces to AWS X-Ray.

### Key Configuration

The following properties are configured in `application.properties`:

```properties
# OpenTelemetry Exporter
quarkus.otel.exporter.otlp.endpoint=http://localhost:4317
quarkus.otel.traces.exporter=otlp

# Trace Propagation
quarkus.otel.propagators=tracecontext,baggage

# Sampling Configuration
quarkus.otel.traces.sampler=parentbased_traceidratio
quarkus.otel.traces.sampler.arg=1.0

# Resource Attributes
quarkus.otel.resource.attributes=service.name=x-ray-backend,service.version=1.0.0
```

### Production Configuration

In production (AWS Lambda), the following environment variables should be set:

```bash
# AWS X-Ray Daemon endpoint (Lambda automatically provides this)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:2000

# Or use AWS Distro for OpenTelemetry (ADOT) Layer
# ARN: arn:aws:lambda:us-west-2:901920570463:layer:aws-otel-java-agent-amd64-ver-1-32-0:1
```

### AWS Lambda Configuration

When deploying to Lambda, ensure the following:

1. **Lambda Configuration:**
   - Runtime: Java 21
   - Handler: `io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest`
   - Memory: 1024 MB (1 GB)
   - Timeout: 60 seconds

2. **IAM Permissions:**
   The Lambda execution role must have:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "xray:PutTraceSegments",
           "xray:PutTelemetryRecords"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

3. **Lambda Tracing:**
   - Enable X-Ray tracing: `Active` or `PassThrough` mode
   - PassThrough mode is recommended for ALB integration

4. **Environment Variables:**
   ```bash
   # Quarkus configuration
   QUARKUS_PROFILE=prod

   # OpenTelemetry (if not using ADOT layer)
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:2000
   OTEL_TRACES_SAMPLER=xray
   OTEL_PROPAGATORS=tracecontext,baggage,xray
   ```

## Deployment

### Package for Lambda

```bash
# Build the Lambda deployment package
./gradlew build

# The deployment package is created at:
build/function.zip
```

### Deploy with Terraform

See the `../terraform/` directory for infrastructure as code to deploy this Lambda function with ALB integration.

```bash
cd ../terraform
terraform init
terraform plan
terraform apply
```

### Manual Deployment

1. Create a Lambda function in AWS Console
2. Choose Java 21 runtime
3. Upload `build/function.zip`
4. Configure handler: `io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest`
5. Set memory to 1024 MB, timeout to 60 seconds
6. Enable X-Ray tracing (PassThrough mode)
7. Add IAM permissions for X-Ray
8. Create ALB target group pointing to the Lambda
9. Add listener rule on ALB to forward requests to target group

## Testing Locally

### Run in Dev Mode

Quarkus Lambda extensions support local development:

```bash
./gradlew quarkusDev
```

Then test with:
```bash
curl http://localhost:8080/api/hello
```

### Test Lambda Locally with SAM

Create a `template.yaml` for AWS SAM:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  XRayBackendFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest
      Runtime: java21
      CodeUri: build/function.zip
      MemorySize: 1024
      Timeout: 60
      Tracing: PassThrough
```

Then run:
```bash
sam local start-api
```

## Code Quality

### Formatting

This project uses Spotless with Google Java Format:

```bash
# Apply formatting
./gradlew spotlessApply

# Check formatting
./gradlew spotlessCheck
```

### Linting

Code follows Java best practices and Quarkus conventions. All code is formatted automatically before compilation.

## Troubleshooting

### OpenTelemetry Configuration Issues

If you encounter issues with OpenTelemetry:

1. Check that the OTLP endpoint is accessible
2. Verify AWS X-Ray daemon is running (in Lambda, it's automatic)
3. Check IAM permissions for X-Ray
4. Review CloudWatch Logs for Lambda errors

### Lambda Cold Start

First invocations may be slow due to Lambda cold starts. Consider:
- Using provisioned concurrency
- Optimizing dependencies
- Using Quarkus native compilation (requires additional setup)

### Trace Not Appearing in X-Ray

1. Verify Lambda has X-Ray tracing enabled
2. Check IAM role has `xray:PutTraceSegments` permission
3. Ensure OTEL configuration is correct
4. Check CloudWatch Logs for errors

## Performance Considerations

- **Memory:** Allocated 1 GB for optimal performance
- **Timeout:** Set to 60 seconds to allow for cold starts
- **Package Size:** Quarkus fast-jar is optimized for Lambda
- **Cold Start:** ~2-3 seconds for first invocation
- **Warm Invocation:** <100ms response time

## Security

- No hardcoded credentials or secrets
- IAM role-based authentication
- All communication with X-Ray is over HTTPS
- Input validation on all endpoints
- JSON parsing with Jackson

## Dependencies

Key dependencies:
- Quarkus 3.17.4
- Java 21
- OpenTelemetry (managed by Quarkus)
- AWS Lambda HTTP Extension
- JUnit 5 and RestAssured for testing

## Contributing

When making changes:
1. Ensure all tests pass: `./gradlew test`
2. Format code: `./gradlew spotlessApply`
3. Update documentation as needed
4. Add tests for new functionality

## License

[Your License Here]

## Support

For issues or questions:
- Check CloudWatch Logs for Lambda execution errors
- Review X-Ray console for trace analysis
- See Quarkus documentation: https://quarkus.io/guides/amazon-lambda-http
