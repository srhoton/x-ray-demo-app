# Main Terraform configuration for X-Ray Demo Backend

# This file serves as the entry point for the Terraform configuration.
# The actual resource definitions are organized in separate files:
#
# - versions.tf: Terraform and provider version constraints
# - variables.tf: Input variable definitions
# - data.tf: Data sources for existing infrastructure
# - lambda.tf: Lambda function and IAM resources
# - alb.tf: ALB target group and listener rule
# - security.tf: Security groups
# - outputs.tf: Output values

# Locals for commonly used values
locals {
  common_tags = merge(
    var.tags,
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Component   = "x-ray-backend"
    }
  )
}

# Validate that required data sources found resources
resource "null_resource" "validate_infrastructure" {
  triggers = {
    vpc_id       = local.vpc_id
    alb_arn      = local.alb_arn
    listener_arn = local.listener_arn
  }

  provisioner "local-exec" {
    command = <<-EOT
      if [ -z "${local.vpc_id}" ]; then
        echo "Error: VPC not found. Please provide vpc_id variable or ensure VPC has 'tier=private' tag"
        exit 1
      fi
      if [ -z "${local.alb_arn}" ]; then
        echo "Error: ALB not found. Please provide alb_arn or alb_name variable"
        exit 1
      fi
      if [ -z "${local.listener_arn}" ]; then
        echo "Error: HTTPS listener not found on ALB"
        exit 1
      fi
    EOT
  }
}
