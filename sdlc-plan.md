# SDLC Plan: AWS X-Ray Demo Application - React Frontend with CloudWatch RUM

## Status: In Progress
## Created: 2026-01-28
## Last Updated: 2026-01-28T16:00:00Z

## Original Request

> Build a simple React UI that is instrumented with AWS CloudWatch RUM, so that the UI is fully integrated with the tracing functionality already built. It needs:
>
> 1. **React Application**:
>    - A simple UI with a button that calls the AppSync backend's `getHello` endpoint
>    - Instrumented with AWS CloudWatch RUM for distributed tracing
>    - Should NOT use AWS Amplify
>    - Should use the existing AppSync API that was already built in this project
>
> 2. **Infrastructure (Terraform)**:
>    - CloudFront distribution for serving the React app
>    - S3 bucket for static hosting
>    - ACM certificate for HTTPS
>    - Route53 subdomain: `xray.sb.fullbay.com`
>    - The domain `sb.fullbay.com` is already set up in Route53 - just need to look up that zone and create the subdomain
>    - CloudWatch RUM App Monitor configuration
>    - All infrastructure should be added to the existing terraform deployment in the `terraform/` directory
>    - The React application should also be deployed by Terraform
>
> 3. **Tracing Integration**:
>    - CloudWatch RUM should be configured to propagate X-Ray traces to the AppSync backend
>    - This will complete the end-to-end tracing: UI → AppSync → Resolver Lambda → Backend Lambda
>
> Key constraints:
> - No AWS Amplify
> - Use existing terraform deployment structure
> - React app should be simple and focused (just a button to call getHello)
> - Domain must be xray.sb.fullbay.com

## Clarifications

### Confirmed Configuration
- **CloudWatch RUM App Monitor**: 100% session sampling rate (capture all sessions for demo)
- **ACM Certificate**: Specific to `xray.sb.fullbay.com` (not wildcard)
- **S3 Bucket Naming**: `xray-demo-frontend-<account-id>`
- **CloudFront Distribution**: Basic setup, no special security headers
- **React Build Process**: Terraform triggers React build automatically during apply
- **Environment Variables**: Build-time configuration (AppSync URL/key baked into bundle)
- **Route53 Zone**: Existing zone ID: Z00265943SONMGC7WELPH (sb.fullbay.com)
- **AppSync API**: Already deployed at https://ju4yjdc2incctntbc3lvlq4fdi.appsync-api.us-west-2.amazonaws.com/graphql

## Architecture Overview

This phase adds a React frontend application with AWS CloudWatch RUM instrumentation to complete the end-to-end distributed tracing demonstration.

### Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud (us-west-2)                    │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ CloudFront Distribution (xray.sb.fullbay.com)             │  │
│  │   ├─ ACM Certificate (HTTPS)                              │  │
│  │   ├─ CloudWatch RUM (X-Ray Integration)                   │  │
│  │   └─ Origin: S3 Static Website                            │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │                                           │
│  ┌────────────────────▼──────────────────────────────────────┐  │
│  │ S3 Bucket (Static Website Hosting)                        │  │
│  │   ├─ React SPA Build Artifacts                            │  │
│  │   ├─ CloudWatch RUM Web Client                            │  │
│  │   └─ index.html, bundle.js, assets/                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  User → CloudFront → S3 → React App (Browser)                    │
│                                  │                                │
│                                  ▼                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ CloudWatch RUM App Monitor                                │  │
│  │   ├─ Session Recording                                    │  │
│  │   ├─ Performance Metrics                                  │  │
│  │   ├─ X-Ray Trace Propagation                              │  │
│  │   └─ Error Tracking                                       │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │                                           │
│                       ▼                                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ AWS AppSync GraphQL API                                   │  │
│  │   ├─ X-Ray Tracing Enabled                                │  │
│  │   ├─ API Key Authentication                               │  │
│  │   └─ Query: getHello                                      │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │                                           │
│                       ▼                                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Lambda Resolver (TypeScript/Node.js 20)                   │  │
│  │   ├─ OpenTelemetry X-Ray Tracing                          │  │
│  │   └─ Calls Backend via ALB                                │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │                                           │
│                       ▼                                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Application Load Balancer                                 │  │
│  │   ├─ HTTPS Listener                                       │  │
│  │   └─ Path: /api/hello                                     │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │                                           │
│                       ▼                                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Lambda Backend (Quarkus/Java 21)                          │  │
│  │   ├─ OpenTelemetry X-Ray Tracing                          │  │
│  │   └─ Returns: { message, timestamp }                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ AWS X-Ray                                                 │  │
│  │   └─ Complete Distributed Trace:                          │  │
│  │      UI → AppSync → Resolver → ALB → Backend              │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Request Flow with Tracing

1. **User Interaction**: User clicks button on React UI
2. **CloudWatch RUM**: Captures user interaction, starts trace segment
3. **GraphQL Request**: React app sends GraphQL query to AppSync
4. **AppSync**: Receives request, propagates X-Ray trace context
5. **Lambda Resolver**: Receives AppSync event with trace context
6. **HTTP Call to ALB**: Resolver makes HTTPS request with X-Ray headers
7. **Backend Lambda**: Processes request, returns response
8. **Trace Aggregation**: All segments sent to X-Ray for visualization

### Key Technologies

**Frontend:**
- React 18 (functional components, hooks)
- TypeScript (strict mode)
- Vite (build tool)
- AWS CloudWatch RUM Web Client SDK
- GraphQL (AppSync client)
- Tailwind CSS (styling)

**Infrastructure:**
- AWS S3 (static website hosting)
- AWS CloudFront (CDN and HTTPS)
- AWS ACM (SSL/TLS certificate)
- AWS Route53 (DNS)
- AWS CloudWatch RUM (monitoring and tracing)
- Terraform (infrastructure as code)

**Integration:**
- CloudWatch RUM X-Ray integration
- AppSync GraphQL API (existing)
- OpenTelemetry trace propagation

## Components

### Component: React Frontend Application
- **Type**: frontend
- **Technology**: React 18 / TypeScript / Vite / Tailwind CSS
- **Subagent**: react-agent
- **Status**: Approved
- **Dependencies**: None (can be implemented first)
- **Description**: Simple React SPA with a button to call AppSync `getHello` query. Instrumented with CloudWatch RUM Web Client SDK for distributed tracing. Uses functional components, TypeScript, and Vite for build. Styled with Tailwind CSS.
- **Files**:
  - `x-ray-frontend/package.json` - Dependencies, scripts, project metadata
  - `x-ray-frontend/tsconfig.json` - TypeScript configuration (strict mode)
  - `x-ray-frontend/vite.config.ts` - Vite build configuration
  - `x-ray-frontend/tailwind.config.js` - Tailwind CSS configuration
  - `x-ray-frontend/postcss.config.js` - PostCSS configuration for Tailwind
  - `x-ray-frontend/index.html` - HTML entry point
  - `x-ray-frontend/src/main.tsx` - React app entry point
  - `x-ray-frontend/src/App.tsx` - Main app component
  - `x-ray-frontend/src/components/HelloButton.tsx` - Button component that calls AppSync
  - `x-ray-frontend/src/services/appsync.ts` - AppSync GraphQL client
  - `x-ray-frontend/src/services/rum.ts` - CloudWatch RUM initialization
  - `x-ray-frontend/src/types/index.ts` - TypeScript type definitions
  - `x-ray-frontend/src/config.ts` - Configuration (AppSync URL, RUM config)
  - `x-ray-frontend/src/index.css` - Global styles with Tailwind directives
  - `x-ray-frontend/.gitignore` - Git ignore file
  - `x-ray-frontend/README.md` - Frontend documentation
  - `x-ray-frontend/vitest.config.ts` - Test configuration
  - `x-ray-frontend/src/__tests__/App.test.tsx` - Component tests
- **Review History**: None yet

### Component: CloudWatch RUM Infrastructure
- **Type**: infrastructure
- **Technology**: Terraform (CloudWatch RUM, IAM)
- **Subagent**: terraform-agent
- **Status**: Pending
- **Dependencies**: None (can be implemented in parallel)
- **Description**: Creates CloudWatch RUM App Monitor with X-Ray integration. Configures identity pool for anonymous access from the React app. Sets up IAM roles and policies for RUM data collection.
- **Files**:
  - `terraform/rum.tf` - CloudWatch RUM App Monitor, Cognito Identity Pool, IAM roles
  - `terraform/variables.tf` - Add RUM-specific variables (app monitor name, sampling rate)
  - `terraform/outputs.tf` - Add RUM outputs (monitor ID, identity pool ID, region)
- **Review History**: None yet

### Component: Frontend Hosting Infrastructure
- **Type**: infrastructure
- **Technology**: Terraform (S3, CloudFront, ACM, Route53)
- **Subagent**: terraform-agent
- **Status**: Pending
- **Dependencies**: React Frontend Application (needs build artifacts), CloudWatch RUM Infrastructure (needs RUM config)
- **Description**: Creates S3 bucket for static website hosting, CloudFront distribution with custom domain, ACM certificate for HTTPS, and Route53 DNS record. Implements Terraform-based build and deployment process for React app. Configures CloudFront to serve React SPA with proper routing.
- **Files**:
  - `terraform/frontend.tf` - S3 bucket, CloudFront distribution, bucket policies
  - `terraform/acm.tf` - ACM certificate for xray.sb.fullbay.com
  - `terraform/route53.tf` - Route53 record for subdomain
  - `terraform/variables.tf` - Add frontend-specific variables (domain name, bucket name)
  - `terraform/outputs.tf` - Add frontend outputs (CloudFront URL, S3 bucket name)
  - `terraform/data.tf` - Add Route53 zone data source
- **Review History**: None yet

### Component: Frontend Deployment Process
- **Type**: infrastructure
- **Technology**: Terraform (null_resource, local-exec)
- **Subagent**: terraform-agent
- **Status**: Pending
- **Dependencies**: React Frontend Application (needs source code), Frontend Hosting Infrastructure (needs S3 bucket)
- **Description**: Automates React build process and deployment to S3 using Terraform. Configures runtime environment variables for AppSync and RUM. Invalidates CloudFront cache after deployment.
- **Files**:
  - `terraform/frontend-deploy.tf` - Build process, S3 sync, CloudFront invalidation
- **Review History**: None yet

## Implementation Order

This project has clear dependencies that require sequential implementation for infrastructure components, but the React app can be developed in parallel with RUM infrastructure.

### Phase 1: Frontend Development (Parallel)
1. **React Frontend Application** - Develop first as it's independent. Creates the UI and integration with AppSync.
   - Reason: Can be developed and tested independently with mock data
   - No dependencies on infrastructure being deployed

2. **CloudWatch RUM Infrastructure** - Can be created in parallel with React development
   - Reason: Independent of other infrastructure, just needs to exist before frontend deployment
   - Provides credentials and config that React app needs

### Phase 2: Hosting Infrastructure (Sequential)
3. **ACM Certificate** - Must be created first as CloudFront depends on it
   - Reason: Certificate validation can take time, CloudFront needs valid cert
   - No dependencies

4. **Frontend Hosting Infrastructure** - S3 and CloudFront distribution
   - Reason: Depends on ACM certificate being validated
   - Needs React build artifacts to exist (but not deployed yet)

5. **Route53 DNS** - Can be created after CloudFront distribution exists
   - Reason: Needs CloudFront distribution domain name
   - Completes the custom domain setup

### Phase 3: Deployment (Sequential)
6. **Frontend Deployment Process** - Build and deploy React app to S3
   - Reason: Needs S3 bucket to exist, needs RUM config from infrastructure
   - Final step that makes everything live

**Note**: React development (1) and RUM infrastructure (2) can proceed in parallel. Once both are complete, we proceed sequentially through hosting infrastructure (3-5) and finally deployment (6).

## Commits

- [ ] React Frontend Application: Add React UI with CloudWatch RUM instrumentation
- [ ] CloudWatch RUM Infrastructure: Add CloudWatch RUM App Monitor with X-Ray integration
- [ ] Frontend Hosting Infrastructure: Add S3, CloudFront, ACM, and Route53 for frontend hosting
- [ ] Frontend Deployment Process: Add automated React build and deployment to S3

## Current Phase

**Phase**: 2-Implementation
**Current Component**: React Frontend Application
**Current Action**: Dispatching to react-agent to implement React UI with CloudWatch RUM

## Error Log

No errors encountered yet.
