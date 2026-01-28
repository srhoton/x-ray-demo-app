# AWS AppSync GraphQL API with Lambda resolver

# GraphQL schema for the API
resource "aws_appsync_graphql_api" "main" {
  name                = var.appsync_api_name
  authentication_type = "API_KEY"
  xray_enabled        = var.enable_xray_tracing

  schema = <<SCHEMA
type Query {
  getHello: HelloResponse
}

type HelloResponse {
  message: String!
  timestamp: String!
}

schema {
  query: Query
}
SCHEMA

  log_config {
    cloudwatch_logs_role_arn = aws_iam_role.appsync_logs.arn
    field_log_level          = var.appsync_log_level
    exclude_verbose_content  = false
  }

  tags = merge(
    var.tags,
    {
      Name = var.appsync_api_name
    }
  )
}

# API Key for AppSync (valid for 365 days)
resource "aws_appsync_api_key" "main" {
  api_id  = aws_appsync_graphql_api.main.id
  expires = timeadd(timestamp(), "8760h") # 365 days
}

# IAM role for AppSync CloudWatch Logs
resource "aws_iam_role" "appsync_logs" {
  name_prefix = "${var.appsync_api_name}-logs-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "appsync.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.appsync_api_name}-logs-role"
    }
  )
}

# Policy for AppSync to write to CloudWatch Logs
resource "aws_iam_role_policy" "appsync_logs" {
  name = "cloudwatch-logs-policy"
  role = aws_iam_role.appsync_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/appsync/*"
      }
    ]
  })
}

# IAM role for AppSync to invoke Lambda resolver
resource "aws_iam_role" "appsync_lambda" {
  name_prefix = "${var.appsync_api_name}-lambda-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "appsync.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.appsync_api_name}-lambda-role"
    }
  )
}

# Policy for AppSync to invoke Lambda resolver
resource "aws_iam_role_policy" "appsync_lambda" {
  name = "lambda-invoke-policy"
  role = aws_iam_role.appsync_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = aws_lambda_function.resolver.arn
      }
    ]
  })
}

# Lambda data source for AppSync
resource "aws_appsync_datasource" "resolver_lambda" {
  api_id           = aws_appsync_graphql_api.main.id
  name             = "ResolverLambda"
  type             = "AWS_LAMBDA"
  service_role_arn = aws_iam_role.appsync_lambda.arn

  lambda_config {
    function_arn = aws_lambda_function.resolver.arn
  }
}

# Resolver for getHello query
resource "aws_appsync_resolver" "get_hello" {
  api_id      = aws_appsync_graphql_api.main.id
  type        = "Query"
  field       = "getHello"
  data_source = aws_appsync_datasource.resolver_lambda.name
  kind        = "UNIT"

  # Direct Lambda invocation - no request/response templates needed
  # AppSync will pass the event directly to Lambda
  request_template = <<EOF
{
  "version": "2018-05-29",
  "operation": "Invoke",
  "payload": $util.toJson($context)
}
EOF

  response_template = "$util.toJson($context.result)"
}

# CloudWatch Log Group for AppSync
resource "aws_cloudwatch_log_group" "appsync" {
  name              = "/aws/appsync/apis/${aws_appsync_graphql_api.main.id}"
  retention_in_days = 7

  tags = merge(
    var.tags,
    {
      Name = "${var.appsync_api_name}-logs"
    }
  )
}
