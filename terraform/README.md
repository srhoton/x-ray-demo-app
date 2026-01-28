# X-Ray Demo Backend - Terraform Infrastructure

This directory contains Terraform configuration to deploy the X-Ray demo backend Lambda function with Application Load Balancer integration in AWS.

## Overview

This Terraform configuration creates:
- AWS Lambda function running the Quarkus backend application
- IAM roles and policies for Lambda execution and X-Ray tracing
- Security groups for Lambda VPC networking
- ALB target group for Lambda
- ALB listener rule to route requests to Lambda
- CloudWatch Log Group for Lambda logs

## Prerequisites

- Terraform >= 1.5.0
- AWS CLI configured with appropriate credentials
- Existing AWS infrastructure:
  - VPC with private subnets tagged with `tier=private`
  - Application Load Balancer (ALB) with HTTPS listener
- Built Lambda deployment package (automatically built by Terraform)

## Architecture

```
Internet → ALB (HTTPS Listener) → Listener Rule → Target Group → Lambda Function → X-Ray
                                                                        ↓
                                                                  CloudWatch Logs
```

## File Structure

```
terraform/
├── main.tf              # Main configuration and validation
├── versions.tf          # Terraform and provider versions
├── variables.tf         # Input variable definitions
├── data.tf              # Data sources for existing infrastructure
├── lambda.tf            # Lambda function, IAM roles, and build process
├── alb.tf              # ALB target group and listener rule
├── security.tf         # Security groups for Lambda
├── outputs.tf          # Output values
├── terraform.tfvars    # Variable values (create this file)
└── README.md           # This file
```

## Quick Start

### 1. Create Variable Values File

Create a `terraform.tfvars` file with your configuration:

```hcl
# Required: AWS Region
aws_region = "us-west-2"

# Required: Environment
environment = "dev"

# Optional: Specify existing infrastructure
# If not provided, Terraform will look up by tags
alb_name = "my-existing-alb"
vpc_id   = "vpc-xxxxxxxxxxxxx"

# Optional: Customize Lambda configuration
lambda_function_name = "x-ray-backend"
lambda_memory_size   = 1024
lambda_timeout       = 60

# Optional: ALB listener rule configuration
listener_rule_priority = 100
api_path_pattern      = "/api/hello"

# Optional: X-Ray configuration
enable_xray_tracing = true
xray_tracing_mode   = "PassThrough"
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review the Plan

```bash
terraform plan
```

### 4. Apply Configuration

```bash
terraform apply
```

### 5. Get Outputs

```bash
terraform output
```

## Variables

### Required Variables

None - all variables have defaults, but you should customize them for your environment.

### Common Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `aws_region` | AWS region | `us-west-2` | No |
| `environment` | Environment name | `dev` | No |
| `project_name` | Project name | `x-ray-demo` | No |
| `lambda_function_name` | Lambda function name | `x-ray-backend` | No |
| `lambda_memory_size` | Lambda memory in MB | `1024` | No |
| `lambda_timeout` | Lambda timeout in seconds | `60` | No |
| `alb_arn` | ARN of existing ALB | `""` | No |
| `alb_name` | Name of existing ALB | `""` | No |
| `vpc_id` | VPC ID | `""` | No |
| `api_path_pattern` | API path pattern | `/api/hello` | No |
| `enable_xray_tracing` | Enable X-Ray | `true` | No |
| `xray_tracing_mode` | X-Ray mode | `PassThrough` | No |

### Finding Existing Infrastructure

The Terraform configuration will automatically look up existing infrastructure:

- **VPC**: If `vpc_id` is not provided, looks for VPC with subnets tagged `tier=private`
- **ALB**: If `alb_arn` is not provided, uses `alb_name` to look up the ALB
- **Subnets**: Automatically finds private subnets in the VPC with tag `tier=private`
- **HTTPS Listener**: Automatically finds HTTPS listener (port 443) on the ALB

## Outputs

After successful deployment, Terraform outputs the following information:

```bash
# Lambda function details
terraform output lambda_function_name
terraform output lambda_function_arn

# ALB integration details
terraform output target_group_arn
terraform output api_endpoint_path

# Monitoring
terraform output cloudwatch_log_group

# X-Ray configuration
terraform output xray_tracing_enabled
terraform output xray_tracing_mode
```

## Lambda Function Configuration

### Environment Variables

The Lambda function is configured with the following environment variables:

- `QUARKUS_PROFILE=prod` - Quarkus production profile
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:2000` - X-Ray daemon endpoint
- `OTEL_TRACES_SAMPLER=xray` - X-Ray compatible sampling
- `OTEL_PROPAGATORS=tracecontext,baggage,xray` - Trace propagators including X-Ray
- `OTEL_RESOURCE_ATTRIBUTES` - Service metadata for X-Ray

### IAM Permissions

The Lambda execution role includes:

- `AWSLambdaBasicExecutionRole` - CloudWatch Logs write permissions
- `AWSLambdaVPCAccessExecutionRole` - VPC networking permissions
- Custom policy for X-Ray tracing:
  - `xray:PutTraceSegments`
  - `xray:PutTelemetryRecords`

### VPC Configuration

Lambda is deployed in private subnets for security. Ensure:
- Private subnets have route to NAT Gateway for internet access (if needed)
- VPC has necessary endpoints for Lambda, CloudWatch, X-Ray
- Security groups allow outbound traffic for AWS services

## ALB Configuration

### Target Group

- Type: `lambda`
- Health checks enabled on `/api/hello` endpoint
- Health check interval: 30 seconds
- Healthy threshold: 2 consecutive successes

### Listener Rule

- Priority: 100 (configurable)
- Condition: Path pattern `/api/hello` (configurable)
- Action: Forward to Lambda target group

## X-Ray Tracing

### Configuration

- **Mode**: PassThrough (default) - Lambda propagates trace context from ALB
- **Sampling**: Configured to use X-Ray sampling rules
- **Propagation**: Supports W3C Trace Context, Baggage, and AWS X-Ray formats

### Viewing Traces

1. Navigate to AWS X-Ray console
2. Select "Service map" to see service topology
3. Select "Traces" to view individual traces
4. Filter by service name: `x-ray-backend`

## Testing the Deployment

### 1. Get ALB Endpoint

```bash
# Get the ALB DNS name
aws elbv2 describe-load-balancers \
  --names <your-alb-name> \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

### 2. Test the Endpoint

```bash
# Test the Lambda via ALB
curl https://<alb-dns-name>/api/hello

# Expected response:
# {
#   "message": "Hello World",
#   "timestamp": "2026-01-28T12:34:56.789Z"
# }
```

### 3. Check CloudWatch Logs

```bash
# Stream Lambda logs
aws logs tail /aws/lambda/x-ray-backend --follow
```

### 4. View X-Ray Traces

```bash
# Get recent traces
aws xray get-trace-summaries \
  --start-time $(date -u -d '5 minutes ago' +%s) \
  --end-time $(date -u +%s)
```

## Troubleshooting

### Lambda Not Receiving Requests

1. **Check ALB Listener Rule**:
   ```bash
   aws elbv2 describe-rules \
     --listener-arn <listener-arn>
   ```

2. **Check Target Health**:
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn $(terraform output -raw target_group_arn)
   ```

3. **Check Lambda Permissions**:
   ```bash
   aws lambda get-policy \
     --function-name x-ray-backend
   ```

### Lambda Function Errors

1. **Check CloudWatch Logs**:
   ```bash
   aws logs tail /aws/lambda/x-ray-backend --follow
   ```

2. **Check Lambda Configuration**:
   ```bash
   aws lambda get-function-configuration \
     --function-name x-ray-backend
   ```

3. **Verify VPC Configuration**:
   - Ensure private subnets have NAT gateway for outbound access
   - Check security group rules
   - Verify VPC endpoints exist for Lambda, CloudWatch, X-Ray

### X-Ray Traces Not Appearing

1. **Verify X-Ray is enabled**:
   ```bash
   terraform output xray_tracing_enabled
   ```

2. **Check IAM permissions**: Verify Lambda role has X-Ray write permissions

3. **Check X-Ray daemon**: Lambda automatically runs X-Ray daemon

4. **Review OpenTelemetry configuration**: Check environment variables in Lambda

### Build Failures

If Terraform fails during the build phase:

```bash
# Build manually
cd ../x-ray-backend
./gradlew clean build

# Then retry Terraform
cd ../terraform
terraform apply
```

## Updating the Lambda Function

To deploy code changes:

```bash
# Terraform will automatically rebuild if build.gradle changes
terraform apply

# Force rebuild by tainting the build resource
terraform taint null_resource.build_lambda
terraform apply

# Or rebuild manually and apply
cd ../x-ray-backend && ./gradlew clean build && cd ../terraform
terraform apply
```

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Note**: This will not destroy the existing VPC, ALB, or listener - only resources created by this configuration.

## Security Considerations

1. **VPC Configuration**: Lambda is deployed in private subnets for security
2. **IAM Least Privilege**: Lambda role has minimal required permissions
3. **HTTPS Only**: ALB listener uses HTTPS (port 443)
4. **Security Groups**: Lambda has restrictive security group rules
5. **Secrets Management**: No secrets in Terraform state (use AWS Secrets Manager if needed)

## Cost Estimation

Approximate monthly costs (us-west-2, as of 2026):

- **Lambda**:
  - Compute: ~$0.20 per 1M requests (1GB memory, 1s duration)
  - Free tier: 1M requests/month, 400,000 GB-seconds/month
- **ALB**:
  - Existing ALB costs not included
  - Target group: No additional cost
- **CloudWatch Logs**:
  - Ingestion: $0.50 per GB
  - Storage: $0.03 per GB/month
- **X-Ray**:
  - $5.00 per 1M traces recorded
  - $0.50 per 1M traces scanned
  - Free tier: 100,000 traces/month

## Additional Resources

- [Quarkus Lambda Documentation](https://quarkus.io/guides/amazon-lambda-http)
- [AWS Lambda with ALB](https://docs.aws.amazon.com/lambda/latest/dg/services-alb.html)
- [AWS X-Ray Documentation](https://docs.aws.amazon.com/xray/)
- [OpenTelemetry AWS X-Ray](https://aws-otel.github.io/docs/introduction)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

## Support

For issues or questions:
- Check CloudWatch Logs: `/aws/lambda/x-ray-backend`
- Review X-Ray traces in AWS X-Ray console
- Check Terraform state: `terraform show`
- Validate configuration: `terraform validate`
