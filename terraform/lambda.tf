# Lambda Function and related resources

# Build the Lambda deployment package
resource "null_resource" "build_lambda" {
  triggers = {
    # Rebuild when source code changes
    source_hash = filemd5("${path.module}/../x-ray-backend/build.gradle")
  }

  provisioner "local-exec" {
    command     = "./gradlew clean build -x test"
    working_dir = "${path.module}/../x-ray-backend"
  }
}

# Use the Quarkus-generated function.zip for Lambda deployment
locals {
  lambda_zip_path = "${path.module}/../x-ray-backend/build/function.zip"
}

# IAM role for Lambda execution
resource "aws_iam_role" "lambda_execution" {
  name_prefix = "${var.lambda_function_name}-execution-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.lambda_function_name}-execution-role"
    }
  )
}

# Attach AWS managed policy for Lambda basic execution (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach AWS managed policy for VPC execution (if Lambda is in VPC)
resource "aws_iam_role_policy_attachment" "lambda_vpc_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Custom IAM policy for X-Ray tracing
resource "aws_iam_role_policy" "lambda_xray" {
  count = var.enable_xray_tracing ? 1 : 0
  name  = "xray-permissions"
  role  = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      }
    ]
  })
}

# AWS Distro for OpenTelemetry (ADOT) Lambda Collector layer ARN
# This layer provides an OTel collector sidecar that receives OTLP and exports to X-Ray
# See: https://aws-otel.github.io/docs/getting-started/lambda
locals {
  # ADOT Collector layer ARN for us-west-2 (x86_64)
  adot_collector_layer_arn = "arn:aws:lambda:${var.aws_region}:901920570463:layer:aws-otel-collector-amd64-ver-0-102-1:1"
}

# Lambda function
resource "aws_lambda_function" "backend" {
  filename      = local.lambda_zip_path
  function_name = var.lambda_function_name
  role          = aws_iam_role.lambda_execution.arn
  # Use Quarkus Amazon Lambda Stream handler for HTTP/ALB integration
  # This properly bootstraps Quarkus CDI/OpenTelemetry and handles ALB request/response format
  handler          = "io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest"
  source_code_hash = filebase64sha256(local.lambda_zip_path)
  runtime          = "java21"
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout

  # Add ADOT Collector layer for receiving OTLP and exporting to X-Ray
  layers = var.enable_xray_tracing ? [local.adot_collector_layer_arn] : []

  vpc_config {
    subnet_ids         = data.aws_subnets.private.ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      QUARKUS_PROFILE = "prod"
      # Custom ADOT collector configuration for receiving OTLP traces
      # The collector.yaml is bundled in the Lambda deployment package
      OPENTELEMETRY_COLLECTOR_CONFIG_FILE = "/var/task/collector.yaml"
      # OpenTelemetry configuration - Quarkus handles SDK initialization
      # ADOT collector listens on localhost:4317
      OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317"
      OTEL_EXPORTER_OTLP_PROTOCOL = "grpc"
      OTEL_SERVICE_NAME           = var.lambda_function_name
      OTEL_RESOURCE_ATTRIBUTES    = "service.name=${var.lambda_function_name},service.version=1.0.0,cloud.provider=aws,cloud.platform=aws_lambda"
      # Disable metrics and logs export (only traces via ADOT)
      OTEL_METRICS_EXPORTER = "none"
      OTEL_LOGS_EXPORTER    = "none"
      # Enable OpenTelemetry Java auto-configuration
      JAVA_TOOL_OPTIONS                      = "-Dotel.java.global-autoconfigure.enabled=true"
      OTEL_JAVA_GLOBAL_AUTOCONFIGURE_ENABLED = "true"
    }
  }

  dynamic "tracing_config" {
    for_each = var.enable_xray_tracing ? [1] : []
    content {
      mode = var.xray_tracing_mode
    }
  }

  tags = merge(
    var.tags,
    {
      Name = var.lambda_function_name
    }
  )

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_vpc_execution,
    aws_iam_role_policy.lambda_xray
  ]
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.lambda_function_name}"
  retention_in_days = 7

  tags = merge(
    var.tags,
    {
      Name = "${var.lambda_function_name}-logs"
    }
  )
}

# Lambda permission for ALB to invoke
resource "aws_lambda_permission" "alb_invoke" {
  statement_id  = "AllowExecutionFromALB"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "elasticloadbalancing.amazonaws.com"
  source_arn    = aws_lb_target_group.lambda.arn
}
