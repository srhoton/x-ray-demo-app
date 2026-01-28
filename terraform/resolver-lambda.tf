# AppSync Resolver Lambda Function and related resources

# Build the resolver Lambda deployment package
resource "null_resource" "build_resolver" {
  triggers = {
    # Rebuild when source code changes
    source_hash = filemd5("${path.module}/../x-ray-resolver/package.json")
  }

  provisioner "local-exec" {
    command     = "npm install && npm run package"
    working_dir = "${path.module}/../x-ray-resolver"
  }
}

# Path to the resolver Lambda ZIP
locals {
  resolver_zip_path = "${path.module}/../x-ray-resolver/dist/function.zip"
}

# IAM role for resolver Lambda execution
resource "aws_iam_role" "resolver_execution" {
  name_prefix = "${var.resolver_function_name}-execution-"

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
      Name = "${var.resolver_function_name}-execution-role"
    }
  )
}

# Attach AWS managed policy for Lambda basic execution (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "resolver_basic_execution" {
  role       = aws_iam_role.resolver_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach AWS managed policy for VPC execution
resource "aws_iam_role_policy_attachment" "resolver_vpc_execution" {
  role       = aws_iam_role.resolver_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Custom IAM policy for X-Ray tracing
resource "aws_iam_role_policy" "resolver_xray" {
  count = var.enable_xray_tracing ? 1 : 0
  name  = "xray-permissions"
  role  = aws_iam_role.resolver_execution.id

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

# Security group for resolver Lambda
resource "aws_security_group" "resolver" {
  name_prefix = "${var.resolver_function_name}-"
  description = "Security group for AppSync resolver Lambda function"
  vpc_id      = local.vpc_id

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.resolver_function_name}-sg"
    }
  )
}

# Resolver Lambda function
resource "aws_lambda_function" "resolver" {
  filename         = local.resolver_zip_path
  function_name    = var.resolver_function_name
  role             = aws_iam_role.resolver_execution.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256(local.resolver_zip_path)
  runtime          = "nodejs20.x"
  memory_size      = var.resolver_memory_size
  timeout          = var.resolver_timeout

  vpc_config {
    subnet_ids         = data.aws_subnets.private.ids
    security_group_ids = [aws_security_group.resolver.id]
  }

  environment {
    variables = {
      ALB_ENDPOINT                = "https://${data.aws_lb.existing_by_name[0].dns_name}"
      API_PATH                    = var.api_path_pattern
      SERVICE_VERSION             = "1.0.0"
      OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317"
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
      Name = var.resolver_function_name
    }
  )

  depends_on = [
    null_resource.build_resolver,
    aws_iam_role_policy_attachment.resolver_basic_execution,
    aws_iam_role_policy_attachment.resolver_vpc_execution,
    aws_iam_role_policy.resolver_xray
  ]
}

# CloudWatch Log Group for resolver Lambda
resource "aws_cloudwatch_log_group" "resolver" {
  name              = "/aws/lambda/${var.resolver_function_name}"
  retention_in_days = 7

  tags = merge(
    var.tags,
    {
      Name = "${var.resolver_function_name}-logs"
    }
  )
}
