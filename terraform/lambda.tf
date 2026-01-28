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

# Archive the Lambda deployment package
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../x-ray-backend/build/quarkus-app"
  output_path = "${path.module}/lambda-deployment.zip"

  depends_on = [null_resource.build_lambda]
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

# Lambda function
resource "aws_lambda_function" "backend" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = var.lambda_function_name
  role             = aws_iam_role.lambda_execution.arn
  handler          = "io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "java21"
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout

  vpc_config {
    subnet_ids         = data.aws_subnets.private.ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      QUARKUS_PROFILE             = "prod"
      OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:2000"
      OTEL_TRACES_SAMPLER         = "xray"
      OTEL_PROPAGATORS            = "tracecontext,baggage,xray"
      OTEL_RESOURCE_ATTRIBUTES    = "service.name=${var.lambda_function_name},service.version=1.0.0,cloud.provider=aws,cloud.platform=aws_lambda"
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
