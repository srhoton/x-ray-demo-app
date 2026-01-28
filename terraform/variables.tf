variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "x-ray-demo"
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "x-ray-backend"
}

variable "lambda_memory_size" {
  description = "Amount of memory in MB for Lambda function"
  type        = number
  default     = 1024

  validation {
    condition     = var.lambda_memory_size >= 128 && var.lambda_memory_size <= 10240
    error_message = "Lambda memory must be between 128 MB and 10240 MB."
  }
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 60

  validation {
    condition     = var.lambda_timeout >= 1 && var.lambda_timeout <= 900
    error_message = "Lambda timeout must be between 1 and 900 seconds."
  }
}

variable "alb_arn" {
  description = "ARN of the existing Application Load Balancer (optional, will be looked up if not provided)"
  type        = string
  default     = ""
}

variable "alb_name" {
  description = "Name of the existing ALB to look up (used if alb_arn not provided)"
  type        = string
  default     = ""
}

variable "alb_listener_arn" {
  description = "ARN of the existing HTTPS listener on the ALB (optional, will be looked up if not provided)"
  type        = string
  default     = ""
}

variable "vpc_id" {
  description = "ID of the existing VPC (optional, will be looked up if not provided)"
  type        = string
  default     = ""
}

variable "api_path_pattern" {
  description = "Path pattern for ALB listener rule"
  type        = string
  default     = "/api/hello"
}

variable "health_check_path" {
  description = "Path for health check"
  type        = string
  default     = "/api/hello"
}

variable "health_check_interval" {
  description = "Health check interval in seconds"
  type        = number
  default     = 30
}

variable "health_check_timeout" {
  description = "Health check timeout in seconds"
  type        = number
  default     = 5
}

variable "health_check_healthy_threshold" {
  description = "Number of consecutive successful health checks"
  type        = number
  default     = 2
}

variable "health_check_unhealthy_threshold" {
  description = "Number of consecutive failed health checks"
  type        = number
  default     = 2
}

variable "listener_rule_priority" {
  description = "Priority for the ALB listener rule (1-50000)"
  type        = number
  default     = 100

  validation {
    condition     = var.listener_rule_priority >= 1 && var.listener_rule_priority <= 50000
    error_message = "Listener rule priority must be between 1 and 50000."
  }
}

variable "enable_xray_tracing" {
  description = "Enable X-Ray tracing for Lambda function"
  type        = bool
  default     = true
}

variable "xray_tracing_mode" {
  description = "X-Ray tracing mode (Active or PassThrough)"
  type        = string
  default     = "PassThrough"

  validation {
    condition     = contains(["Active", "PassThrough"], var.xray_tracing_mode)
    error_message = "X-Ray tracing mode must be either 'Active' or 'PassThrough'."
  }
}

variable "resolver_function_name" {
  description = "Name of the AppSync resolver Lambda function"
  type        = string
  default     = "x-ray-resolver"
}

variable "resolver_memory_size" {
  description = "Amount of memory in MB for resolver Lambda function"
  type        = number
  default     = 512

  validation {
    condition     = var.resolver_memory_size >= 128 && var.resolver_memory_size <= 10240
    error_message = "Lambda memory must be between 128 MB and 10240 MB."
  }
}

variable "resolver_timeout" {
  description = "Resolver Lambda function timeout in seconds"
  type        = number
  default     = 30

  validation {
    condition     = var.resolver_timeout >= 1 && var.resolver_timeout <= 900
    error_message = "Lambda timeout must be between 1 and 900 seconds."
  }
}

variable "appsync_api_name" {
  description = "Name of the AppSync GraphQL API"
  type        = string
  default     = "x-ray-demo-api"
}

variable "appsync_log_level" {
  description = "AppSync field log level"
  type        = string
  default     = "ALL"

  validation {
    condition     = contains(["NONE", "ERROR", "ALL"], var.appsync_log_level)
    error_message = "Log level must be one of: NONE, ERROR, ALL."
  }
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Frontend configuration variables
variable "frontend_domain" {
  description = "Full domain name for the frontend (e.g., xray.sb.fullbay.com)"
  type        = string
  default     = "xray.sb.fullbay.com"
}

variable "frontend_base_domain" {
  description = "Base domain name for Route53 zone lookup (e.g., sb.fullbay.com)"
  type        = string
  default     = "sb.fullbay.com"
}

variable "rum_session_sample_rate" {
  description = "CloudWatch RUM session sample rate (0.0 to 1.0)"
  type        = number
  default     = 1.0

  validation {
    condition     = var.rum_session_sample_rate >= 0.0 && var.rum_session_sample_rate <= 1.0
    error_message = "RUM session sample rate must be between 0.0 and 1.0."
  }
}
