# Frontend build and deployment automation

# Local variable for frontend source directory
locals {
  frontend_src_dir   = "${path.module}/../x-ray-frontend"
  frontend_build_dir = "${path.module}/../x-ray-frontend/dist"
}

# Null resource to build the React application
resource "null_resource" "frontend_build" {
  triggers = {
    # Rebuild when package.json or any source file changes
    package_json = filemd5("${local.frontend_src_dir}/package.json")
    # Add more source file hashes if needed for more granular rebuilds
    always_run = timestamp() # For demo purposes, rebuild on every apply
  }

  provisioner "local-exec" {
    working_dir = local.frontend_src_dir
    command     = <<-EOT
      npm install
      npm run build
    EOT

    environment = {
      VITE_APPSYNC_URL          = aws_appsync_graphql_api.main.uris["GRAPHQL"]
      VITE_APPSYNC_API_KEY      = aws_appsync_api_key.main.key
      VITE_AWS_REGION           = var.aws_region
      VITE_RUM_APP_ID           = aws_rum_app_monitor.frontend.id
      VITE_RUM_IDENTITY_POOL_ID = aws_cognito_identity_pool.rum.id
    }
  }

  depends_on = [
    aws_rum_app_monitor.frontend,
    aws_cognito_identity_pool.rum,
    aws_appsync_graphql_api.main,
    aws_appsync_api_key.main
  ]
}

# Upload build artifacts to S3
resource "null_resource" "frontend_deploy" {
  triggers = {
    build = null_resource.frontend_build.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws s3 sync ${local.frontend_build_dir} s3://${aws_s3_bucket.frontend.id}/ \
        --delete \
        --cache-control "public, max-age=31536000, immutable" \
        --exclude "*.html" \
        --region ${var.aws_region}

      aws s3 cp ${local.frontend_build_dir}/index.html s3://${aws_s3_bucket.frontend.id}/index.html \
        --cache-control "public, max-age=0, must-revalidate" \
        --content-type "text/html" \
        --region ${var.aws_region}
    EOT
  }

  depends_on = [
    null_resource.frontend_build,
    aws_s3_bucket.frontend,
    aws_s3_bucket_policy.frontend
  ]
}

# Invalidate CloudFront cache after deployment
resource "null_resource" "cloudfront_invalidation" {
  triggers = {
    deploy = null_resource.frontend_deploy.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws cloudfront create-invalidation \
        --distribution-id ${aws_cloudfront_distribution.frontend.id} \
        --paths "/*" \
        --region ${var.aws_region}
    EOT
  }

  depends_on = [
    null_resource.frontend_deploy,
    aws_cloudfront_distribution.frontend
  ]
}
