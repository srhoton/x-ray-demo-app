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
