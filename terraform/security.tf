# Security Groups for Lambda function

# Security group for Lambda function
resource "aws_security_group" "lambda" {
  name_prefix = "${var.project_name}-lambda-"
  description = "Security group for ${var.lambda_function_name} Lambda function"
  vpc_id      = local.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-lambda-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Egress rule: Allow all outbound traffic (for OTLP, AWS services, etc.)
resource "aws_security_group_rule" "lambda_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.lambda.id
  description       = "Allow all outbound traffic"
}

# Security group for ALB to Lambda communication
resource "aws_security_group" "alb_to_lambda" {
  name_prefix = "${var.project_name}-alb-to-lambda-"
  description = "Security group for ALB to Lambda communication"
  vpc_id      = local.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-alb-to-lambda-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Ingress rule: Allow HTTPS from ALB security group (if we can identify it)
# Note: This is a placeholder. In practice, you may need to reference the ALB's security group
# For Lambda with ALB, typically no inbound rules are needed on Lambda SG
# The ALB invokes Lambda via the Lambda service, not direct network connection

# If Lambda needs to access other VPC resources, add appropriate rules here
