# Data sources for existing infrastructure

# Look up VPC by ID if provided, otherwise by tag
data "aws_vpc" "selected" {
  count = var.vpc_id != "" ? 1 : 0
  id    = var.vpc_id
}

data "aws_vpcs" "available" {
  count = var.vpc_id == "" ? 1 : 0

  tags = {
    tier = "private"
  }
}

# Get the VPC ID from either data source
locals {
  vpc_id = var.vpc_id != "" ? data.aws_vpc.selected[0].id : (
    length(data.aws_vpcs.available) > 0 ? data.aws_vpcs.available[0].ids[0] : ""
  )
}

# Look up private subnets with the specified tag
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
  }

  tags = {
    tier = "private"
  }
}

# Look up ALB by ARN or name
data "aws_lb" "existing_by_arn" {
  count = var.alb_arn != "" ? 1 : 0
  arn   = var.alb_arn
}

data "aws_lb" "existing_by_name" {
  count = var.alb_arn == "" && var.alb_name != "" ? 1 : 0
  name  = var.alb_name
}

# Get ALB ARN from either data source
locals {
  alb_arn = var.alb_arn != "" ? data.aws_lb.existing_by_arn[0].arn : (
    var.alb_name != "" ? data.aws_lb.existing_by_name[0].arn : ""
  )
}

# Look up HTTPS listener on the ALB
data "aws_lb_listener" "https" {
  count             = var.alb_listener_arn == "" && local.alb_arn != "" ? 1 : 0
  load_balancer_arn = local.alb_arn
  port              = 443
}

# Get listener ARN
locals {
  listener_arn = var.alb_listener_arn != "" ? var.alb_listener_arn : (
    length(data.aws_lb_listener.https) > 0 ? data.aws_lb_listener.https[0].arn : ""
  )
}

# Get current AWS account ID and region
data "aws_caller_identity" "current" {}

data "aws_region" "current" {}
