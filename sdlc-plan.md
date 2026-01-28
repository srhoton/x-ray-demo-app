# SDLC Plan: AWS X-Ray Demo Backend Application

## Status: Complete
## Created: 2026-01-28
## Last Updated: 2026-01-28

## Original Request
> Build a demo set of applications for AWS X-Ray. First, build the backend service - a Quarkus-based Java application that does simple gets for basic information. No backend needed, can return just a "hello world" response. Needs to sit behind an existing ALB and VPC, accept ALB-based event types. Service instrumented with AWS X-Ray SDK for Java using OpenTelemetry X-ray implementation (NOT deprecated X-ray SDK). Java application in x-ray-backend folder as Lambda with target group for ALB. Terraform in separate terraform directory to deploy Lambda with existing ALB and VPC. Deploy to us-west-2.

## Clarifications
- **Existing ALB and VPC**: Reference by ARNs/IDs, use data sources
- **Subnets**: Private subnets with tag pair key="tier", value="private"
- **Security Groups**: Create new ones
- **ALB Listener**: Use existing HTTPS listener, create new rule
- **Java Runtime**: Java 21
- **Memory/Timeout**: 1GB memory, 1 minute timeout
- **Environment variables**: None needed yet (beyond X-Ray config)
- **API Endpoint**: /api/hello
- **Response Format**: JSON
- **Authentication**: None for now
- **Sampling Rate**: Default X-Ray sampling
- **Tracing Mode**: PassThrough
- **State Backend**: Local Terraform state
- **Deployment**: Include build in Terraform

## Architecture Overview

This system consists of a single serverless backend component deployed to AWS Lambda, fronted by an existing Application Load Balancer. The Lambda function is built with Quarkus and instrumented with OpenTelemetry to send traces to AWS X-Ray.

**Flow**: HTTPS Request → Existing ALB → HTTPS Listener Rule → Target Group → Lambda Function → X-Ray

**Key Technologies**:
- **Runtime**: Java 21 with Quarkus framework
- **Deployment**: AWS Lambda with function URL or ALB target group
- **Tracing**: OpenTelemetry with AWS X-Ray exporter
- **Infrastructure**: Terraform for IaC
- **Build**: Gradle 8.x with Quarkus plugin

## Components

### Component: Quarkus Backend Application
- **Type**: backend
- **Technology**: Java 21 / Quarkus / Gradle
- **Subagent**: java-quarkus-agent
- **Status**: Approved
- **Dependencies**: None (standalone)
- **Description**: Quarkus-based Lambda function that accepts ALB events, returns JSON response, and sends traces to X-Ray via OpenTelemetry
- **Files**:
  - `x-ray-backend/build.gradle` ✓
  - `x-ray-backend/settings.gradle` ✓
  - `x-ray-backend/gradle.properties` ✓
  - `x-ray-backend/src/main/java/com/example/xray/HelloResource.java` ✓
  - `x-ray-backend/src/main/java/com/example/xray/model/HelloResponse.java` ✓
  - `x-ray-backend/src/main/resources/application.properties` ✓
  - `x-ray-backend/src/test/java/com/example/xray/HelloResourceTest.java` ✓
  - `x-ray-backend/README.md` ✓
  - `x-ray-backend/gradlew` ✓
  - `x-ray-backend/gradlew.bat` ✓
  - `x-ray-backend/gradle/wrapper/gradle-wrapper.properties` ✓
  - `x-ray-backend/gradle/wrapper/gradle-wrapper.jar` ✓
- **Review History**:
  - 2026-01-28 Implementation: Complete - All files created, tests passing, Spotless formatting applied

### Component: Terraform Infrastructure
- **Type**: infrastructure
- **Technology**: Terraform / AWS
- **Subagent**: terraform-agent
- **Status**: Approved
- **Dependencies**: Quarkus Backend Application (needs built JAR)
- **Description**: Terraform configuration to deploy Lambda function, create target group, attach to existing ALB HTTPS listener, configure security groups, IAM roles, and X-Ray permissions
- **Files**:
  - `terraform/main.tf` ✓
  - `terraform/variables.tf` ✓
  - `terraform/outputs.tf` ✓
  - `terraform/versions.tf` ✓
  - `terraform/data.tf` ✓
  - `terraform/lambda.tf` ✓
  - `terraform/alb.tf` ✓
  - `terraform/security.tf` ✓
  - `terraform/README.md` ✓
  - `terraform/.gitignore` ✓
  - `terraform/terraform.tfvars.example` ✓
- **Review History**:
  - 2026-01-28 Implementation: Complete - All files created, terraform validate passed, terraform fmt applied

## Implementation Order

1. **Quarkus Backend Application** - Must be built first to produce the Lambda deployment JAR that Terraform will deploy
   - Reason: Terraform depends on the built artifact

2. **Terraform Infrastructure** - Deploy after backend is built and tested locally
   - Reason: Requires the JAR file from component 1

## Commits

- [ ] Quarkus Backend Application: Add Quarkus Lambda backend with OpenTelemetry X-Ray instrumentation
- [ ] Terraform Infrastructure: Add Terraform configuration for Lambda deployment with ALB integration

## Current Phase

**Phase**: 4-Commit
**Current Component**: All components complete
**Current Action**: Ready to commit changes

## Error Log

No errors encountered yet.
