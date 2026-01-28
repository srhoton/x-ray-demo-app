# SDLC Plan: AWS X-Ray Demo Application (Backend + AppSync Resolver)

## Status: In Progress
## Created: 2026-01-28
## Last Updated: 2026-01-28T12:00:00Z

## Original Requests

### Phase 1 (Complete)
> Build a demo set of applications for AWS X-Ray. First, build the backend service - a Quarkus-based Java application that does simple gets for basic information. No backend needed, can return just a "hello world" response. Needs to sit behind an existing ALB and VPC, accept ALB-based event types. Service instrumented with AWS X-Ray SDK for Java using OpenTelemetry X-ray implementation (NOT deprecated X-ray SDK). Java application in x-ray-backend folder as Lambda with target group for ALB. Terraform in separate terraform directory to deploy Lambda with existing ALB and VPC. Deploy to us-west-2.

### Phase 2 (Current)
> Create a folder called `x-ray-resolver` containing an AppSync Lambda resolver that will hit the ALB endpoint built previously. It needs to use AWS X-Ray to trace requests from AppSync to the ALB and back, using OpenTelemetry X-Ray configuration (NOT the deprecated AWS X-Ray SDK).
>
> Context from Phase 1:
> - Repository contains `x-ray-backend/` - Quarkus Java 21 Lambda behind an ALB with endpoint `/api/hello`
> - Repository contains `terraform/` - Terraform infrastructure including ALB, VPC, and Lambda configuration
> - ALB ARN: arn:aws:elasticloadbalancing:us-west-2:345594586248:loadbalancer/app/external-private-alb/720e2b5474d3d602
> - ALB DNS: external-private-alb-984336828.us-west-2.elb.amazonaws.com
> - VPC ID: vpc-03163f35ccd0fc6a9
> - Region: us-west-2
> - Existing Lambda uses OpenTelemetry with X-Ray

## Clarifications

### Phase 1 Clarifications (Complete)
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

### Phase 2 Clarifications (Current)
- **AppSync API**: Create a NEW AppSync API, adding to existing terraform in `terraform/` directory
- **GraphQL Schema**: Simple `getHello: HelloResponse` query carrying ALB response to demonstrate X-Ray tracing
- **ALB Access**: Lambda will be in same VPC (vpc-03163f35ccd0fc6a9), using ALB DNS name (external-private-alb-984336828.us-west-2.elb.amazonaws.com)
- **TLS Validation**: Not a concern - cert is ACM-issued
- **Authentication**: Not required yet
- **X-Ray Tracing**: YES - propagate X-Ray trace context from AppSync to ALB, create subsegments
- **Language**: TypeScript - deployable via Terraform in `terraform/` directory
- **Error Handling**: Return GraphQL errors
- **Response**: Pass through backend response as-is

## Architecture Overview

### Phase 1 Architecture (Complete)
This system consists of a single serverless backend component deployed to AWS Lambda, fronted by an existing Application Load Balancer. The Lambda function is built with Quarkus and instrumented with OpenTelemetry to send traces to AWS X-Ray.

**Flow**: HTTPS Request → Existing ALB → HTTPS Listener Rule → Target Group → Lambda Function → X-Ray

**Key Technologies**:
- **Runtime**: Java 21 with Quarkus framework
- **Deployment**: AWS Lambda with ALB target group
- **Tracing**: OpenTelemetry with AWS X-Ray exporter
- **Infrastructure**: Terraform for IaC
- **Build**: Gradle 8.x with Quarkus plugin

### Phase 2 Architecture (Current)
This phase adds an AWS AppSync GraphQL API with a Lambda resolver that calls the existing ALB-backed Quarkus service. The entire request flow is traced using AWS X-Ray with OpenTelemetry instrumentation.

**Request Flow:**
1. Client → AppSync GraphQL API (`getHello` query)
2. AppSync → Lambda Resolver (TypeScript with OpenTelemetry X-Ray)
3. Lambda → ALB → Backend Lambda (Quarkus with OpenTelemetry X-Ray)
4. Backend responds → ALB → Resolver Lambda
5. Resolver Lambda → AppSync → Client

**X-Ray Tracing:**
- AppSync automatically creates X-Ray trace segments
- Resolver Lambda propagates trace context using OpenTelemetry with X-Ray propagator
- HTTP client includes X-Ray trace headers when calling ALB
- Backend Lambda receives and continues the trace
- Complete distributed trace visible in X-Ray console

**Key Technologies**:
- **Runtime**: Node.js 20.x with TypeScript
- **GraphQL API**: AWS AppSync with schema-first design
- **Resolver**: Direct Lambda resolver
- **Tracing**: OpenTelemetry with AWS X-Ray SDK for JavaScript
- **HTTP Client**: Node.js https module with X-Ray instrumentation
- **Infrastructure**: Terraform for IaC
- **Build**: npm/esbuild for bundling

## Components

### Phase 1 Components (Complete)

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

### Phase 2 Components (Current)

### Component: TypeScript Lambda Resolver
- **Type**: backend
- **Technology**: TypeScript (Node.js 20.x)
- **Subagent**: typescript-agent
- **Status**: Approved
- **Dependencies**: None (can be implemented in parallel with infrastructure)
- **Description**: TypeScript Lambda function that serves as AppSync resolver. Makes HTTPS request to ALB endpoint, propagates X-Ray trace context using OpenTelemetry, handles errors, and returns GraphQL-formatted responses.
- **Files**:
  - `x-ray-resolver/src/index.ts` ✓
  - `x-ray-resolver/src/types.ts` ✓
  - `x-ray-resolver/src/tracing.ts` ✓
  - `x-ray-resolver/src/client.ts` ✓
  - `x-ray-resolver/package.json` ✓
  - `x-ray-resolver/tsconfig.json` ✓
  - `x-ray-resolver/README.md` ✓
  - `x-ray-resolver/.gitignore` ✓
  - `x-ray-resolver/vitest.config.ts` ✓
  - `x-ray-resolver/src/__tests__/index.test.ts` ✓
  - `x-ray-resolver/dist/function.zip` ✓
- **Review History**:
  - 2026-01-28 Implementation: Complete - All files created, tests passing (100% coverage on handler), build successful

### Component: AppSync GraphQL API Infrastructure
- **Type**: infrastructure
- **Technology**: Terraform (AWS AppSync, CloudWatch, IAM)
- **Subagent**: terraform-agent
- **Status**: Pending
- **Dependencies**: TypeScript Lambda Resolver (needs deployment package reference)
- **Description**: Creates AppSync GraphQL API with schema, CloudWatch logging, and IAM roles. Defines `getHello` query that returns HelloResponse type. Links to Lambda resolver.
- **Files**:
  - `terraform/appsync.tf` - AppSync API, schema, data source, resolver, CloudWatch logs
  - `terraform/outputs.tf` - Add AppSync API outputs (API URL, API ID)
  - `terraform/variables.tf` - Add AppSync-specific variables
- **Review History**: None yet

### Component: Lambda Resolver Infrastructure
- **Type**: infrastructure
- **Technology**: Terraform (Lambda, IAM, CloudWatch)
- **Subagent**: terraform-agent
- **Status**: Pending
- **Dependencies**: TypeScript Lambda Resolver (needs deployment package)
- **Description**: Terraform resources for deploying TypeScript Lambda resolver. Includes Lambda function, execution role with X-Ray permissions, VPC configuration, environment variables for ALB endpoint, and CloudWatch log group.
- **Files**:
  - `terraform/resolver-lambda.tf` - Lambda function, IAM role, permissions, build process
  - `terraform/outputs.tf` - Add resolver Lambda outputs
- **Review History**: None yet

## Implementation Order

### Phase 1 (Complete)
1. **Quarkus Backend Application** - Must be built first to produce the Lambda deployment JAR that Terraform will deploy
   - Reason: Terraform depends on the built artifact

2. **Terraform Infrastructure** - Deploy after backend is built and tested locally
   - Reason: Requires the JAR file from component 1

### Phase 2 (Current)
1. **TypeScript Lambda Resolver** - Implement first as it's independent. Creates the deployment package needed by infrastructure.
   - Reason: Can be developed and tested independently

2. **Lambda Resolver Infrastructure** - Terraform resources for deploying the resolver Lambda
   - Reason: Depends on TypeScript code being written (for build process)

3. **AppSync GraphQL API Infrastructure** - Creates AppSync API and links to resolver Lambda
   - Reason: Depends on resolver Lambda infrastructure being defined

Note: TypeScript and Terraform work can proceed in parallel since the AppSync infrastructure will reference the Lambda by name/ARN patterns.

## Commits

### Phase 1 (Complete - Not Yet Committed)
- [ ] Quarkus Backend Application: Add Quarkus Lambda backend with OpenTelemetry X-Ray instrumentation
- [ ] Terraform Infrastructure: Add Terraform configuration for Lambda deployment with ALB integration

### Phase 2 (Current)
- [ ] TypeScript Lambda Resolver: Add AppSync Lambda resolver with OpenTelemetry X-Ray tracing
- [ ] Terraform Infrastructure: Add AppSync API and resolver Lambda infrastructure with X-Ray

## Current Phase

**Phase**: 2-Implementation
**Current Component**: TypeScript Lambda Resolver
**Current Action**: Creating formal SDLC plan document, about to dispatch to typescript-agent

## Error Log

No errors encountered yet.
