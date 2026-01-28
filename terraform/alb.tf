# ALB Target Group and Listener Rule

# Target group for Lambda function
resource "aws_lb_target_group" "lambda" {
  name_prefix = "xray-"
  target_type = "lambda"

  # Health check configuration for Lambda target
  health_check {
    enabled             = true
    path                = var.health_check_path
    interval            = var.health_check_interval
    timeout             = var.health_check_timeout
    healthy_threshold   = var.health_check_healthy_threshold
    unhealthy_threshold = var.health_check_unhealthy_threshold
    matcher             = "200"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.lambda_function_name}-tg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Attach Lambda function to target group
resource "aws_lb_target_group_attachment" "lambda" {
  target_group_arn = aws_lb_target_group.lambda.arn
  target_id        = aws_lambda_function.backend.arn

  depends_on = [aws_lambda_permission.alb_invoke]
}

# Listener rule to route requests to Lambda target group
resource "aws_lb_listener_rule" "lambda" {
  listener_arn = local.listener_arn
  priority     = var.listener_rule_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.lambda.arn
  }

  condition {
    path_pattern {
      values = [var.api_path_pattern]
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.lambda_function_name}-listener-rule"
    }
  )
}
