# CloudWatch RUM (Real User Monitoring) configuration
# Provides browser-side distributed tracing with X-Ray integration

# CloudWatch RUM App Monitor
resource "aws_rum_app_monitor" "frontend" {
  name   = "${var.project_name}-frontend"
  domain = var.frontend_domain

  app_monitor_configuration {
    allow_cookies       = true
    enable_xray         = true
    session_sample_rate = var.rum_session_sample_rate
    telemetries         = ["errors", "performance", "http"]
    identity_pool_id    = aws_cognito_identity_pool.rum.id
    guest_role_arn      = aws_iam_role.rum_unauthenticated.arn

    favorite_pages = [
      "/"
    ]
  }

  # Ensure identity pool and role are created first
  depends_on = [
    aws_cognito_identity_pool.rum,
    aws_iam_role.rum_unauthenticated,
    aws_cognito_identity_pool_roles_attachment.rum
  ]

  tags = merge(
    var.tags,
    {
      Name      = "${var.project_name}-frontend-rum"
      Component = "frontend"
    }
  )
}

# Cognito Identity Pool for anonymous RUM access
resource "aws_cognito_identity_pool" "rum" {
  identity_pool_name               = "${var.project_name}-rum-pool"
  allow_unauthenticated_identities = true
  allow_classic_flow               = true

  tags = merge(
    var.tags,
    {
      Name      = "${var.project_name}-rum-identity-pool"
      Component = "frontend"
    }
  )
}

# IAM role for unauthenticated RUM access
resource "aws_iam_role" "rum_unauthenticated" {
  name_prefix = "${var.project_name}-rum-unauth-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.rum.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "unauthenticated"
          }
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name      = "${var.project_name}-rum-unauthenticated-role"
      Component = "frontend"
    }
  )
}

# Policy allowing RUM data submission
resource "aws_iam_role_policy" "rum_put_events" {
  name_prefix = "rum-put-events-"
  role        = aws_iam_role.rum_unauthenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rum:PutRumEvents"
        ]
        Resource = aws_rum_app_monitor.frontend.arn
      }
    ]
  })
}

# Attach the unauthenticated role to the identity pool
resource "aws_cognito_identity_pool_roles_attachment" "rum" {
  identity_pool_id = aws_cognito_identity_pool.rum.id

  roles = {
    "unauthenticated" = aws_iam_role.rum_unauthenticated.arn
  }
}
