# Terraform outputs

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.backend.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.backend.arn
}

output "lambda_function_version" {
  description = "Latest published version of the Lambda function"
  value       = aws_lambda_function.backend.version
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}

output "lambda_security_group_id" {
  description = "ID of the Lambda security group"
  value       = aws_security_group.lambda.id
}

output "target_group_arn" {
  description = "ARN of the ALB target group"
  value       = aws_lb_target_group.lambda.arn
}

output "target_group_name" {
  description = "Name of the ALB target group"
  value       = aws_lb_target_group.lambda.name
}

output "listener_rule_arn" {
  description = "ARN of the ALB listener rule"
  value       = aws_lb_listener_rule.lambda.arn
}

output "vpc_id" {
  description = "VPC ID where Lambda is deployed"
  value       = local.vpc_id
}

output "subnet_ids" {
  description = "Subnet IDs where Lambda is deployed"
  value       = data.aws_subnets.private.ids
}

output "api_endpoint_path" {
  description = "API endpoint path pattern"
  value       = var.api_path_pattern
}

output "cloudwatch_log_group" {
  description = "CloudWatch Log Group name for Lambda"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "xray_tracing_enabled" {
  description = "Whether X-Ray tracing is enabled"
  value       = var.enable_xray_tracing
}

output "xray_tracing_mode" {
  description = "X-Ray tracing mode"
  value       = var.enable_xray_tracing ? var.xray_tracing_mode : "Disabled"
}

# AppSync Resolver Lambda outputs
output "resolver_function_name" {
  description = "Name of the AppSync resolver Lambda function"
  value       = aws_lambda_function.resolver.function_name
}

output "resolver_function_arn" {
  description = "ARN of the AppSync resolver Lambda function"
  value       = aws_lambda_function.resolver.arn
}

output "resolver_security_group_id" {
  description = "ID of the resolver Lambda security group"
  value       = aws_security_group.resolver.id
}

output "resolver_log_group" {
  description = "CloudWatch Log Group name for resolver Lambda"
  value       = aws_cloudwatch_log_group.resolver.name
}

# AppSync API outputs
output "appsync_api_id" {
  description = "ID of the AppSync GraphQL API"
  value       = aws_appsync_graphql_api.main.id
}

output "appsync_api_url" {
  description = "URL of the AppSync GraphQL API"
  value       = aws_appsync_graphql_api.main.uris["GRAPHQL"]
}

output "appsync_api_key" {
  description = "API key for the AppSync API (sensitive)"
  value       = aws_appsync_api_key.main.key
  sensitive   = true
}

output "appsync_api_name" {
  description = "Name of the AppSync GraphQL API"
  value       = aws_appsync_graphql_api.main.name
}

# Frontend outputs
output "frontend_url" {
  description = "Frontend application URL"
  value       = "https://${var.frontend_domain}"
}

output "frontend_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for the frontend"
  value       = aws_cloudfront_distribution.frontend.id
}

output "frontend_cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_s3_bucket" {
  description = "S3 bucket name for frontend static files"
  value       = aws_s3_bucket.frontend.id
}

output "rum_app_monitor_id" {
  description = "CloudWatch RUM App Monitor ID"
  value       = aws_rum_app_monitor.frontend.app_monitor_id
}

output "rum_identity_pool_id" {
  description = "Cognito Identity Pool ID for RUM"
  value       = aws_cognito_identity_pool.rum.id
}
