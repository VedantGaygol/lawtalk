# LawTalk CloudFormation Infrastructure

Six modular stacks. Deploy in order.

## Stack Overview

| # | File | What it creates |
|---|------|-----------------|
| 1 | `01-networking.yml` | VPC, 2 public + 2 private subnets, IGW, NAT Gateway, route tables |
| 2 | `02-database.yml` | RDS PostgreSQL 15, Secrets Manager credential, subnet group, security group |
| 3 | `03-backend.yml` | ALB, EC2 ASG + Launch Template, IAM instance profile, CodeDeploy app/DG |
| 4 | `04-frontend.yml` | AWS Amplify Hosting app + branch + custom domain (auto-builds on push) |
| 5 | `05-notifications.yml` | Uploads S3 bucket, SQS queue, Lambda email worker, Cloudinary secret |
| 6 | `06-cicd.yml` | CodePipeline (GitHub → CodeBuild → CodeDeploy + S3 sync) |

## Prerequisites

- AWS CLI configured for `us-east-1`
- A Route 53 hosted zone for your domain
- An ACM certificate in **us-east-1** covering `*.yourdomain.com` (required for CloudFront)
- A second ACM certificate in your stack region covering `api.yourdomain.com` (for ALB)
- An existing CodeStar/CodeConnections GitHub connection ARN
- An EC2 key pair

## Deployment Order

```bash
DOMAIN=lawtalk.in
HZ_ID=<your-hosted-zone-id>
ACM_CF=<acm-cert-arn-us-east-1>       # for CloudFront
ACM_ALB=<acm-cert-arn-us-east-1>      # for ALB (same region as stack)
CONN_ARN=<codestar-connection-arn>
KEY_PAIR=<ec2-key-pair-name>

# 1. Networking
aws cloudformation deploy \
  --stack-name lawtalk-networking \
  --template-file 01-networking.yml \
  --parameter-overrides EnvironmentName=lawtalk \
  --region us-east-1

# 2. Backend (creates BackendSG export needed by database stack)
aws cloudformation deploy \
  --stack-name lawtalk-backend \
  --template-file 03-backend.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    EnvironmentName=lawtalk \
    KeyPairName=$KEY_PAIR \
    ALBCertificateArn=$ACM_ALB \
  --region us-east-1

# 3. Database (imports BackendSG from backend stack)
aws cloudformation deploy \
  --stack-name lawtalk-database \
  --template-file 02-database.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides EnvironmentName=lawtalk \
  --region us-east-1

# 4. Frontend (Amplify – auto-provisions ACM cert and DNS)
aws cloudformation deploy \
  --stack-name lawtalk-frontend \
  --template-file 04-frontend.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    EnvironmentName=lawtalk \
    GitHubConnectionArn=$CONN_ARN \
    DomainName=$DOMAIN \
    ViteApiUrl=https://api.$DOMAIN \
  --region us-east-1

# 5. Notifications
aws cloudformation deploy \
  --stack-name lawtalk-notifications \
  --template-file 05-notifications.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    EnvironmentName=lawtalk \
    SESFromEmail=noreply@$DOMAIN \
    CloudinaryCloudName=<your-cloud-name> \
    CloudinaryApiKey=<key> \
    CloudinaryApiSecret=<secret> \
  --region us-east-1

# 6. CI/CD (deploy last – imports from all other stacks)
aws cloudformation deploy \
  --stack-name lawtalk-cicd \
  --template-file 06-cicd.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    EnvironmentName=lawtalk \
    GitHubConnectionArn=$CONN_ARN \
  --region us-east-1
```

## Post-Deploy Steps

1. Copy `cfn/buildspec-updated.yml` → `buildspec.yml` in the repo root and push.
2. Amplify will auto-build the frontend on every push to `main` — no manual steps needed.
3. Add a Route 53 alias record for `api.yourdomain.com` → ALB DNS name
   (exported as `lawtalk-ALBDnsName`).
4. Verify SES sender email in the AWS console before Lambda can send mail.
5. Run DB migrations from a bastion or via SSM session on an EC2 instance:
   `cd /home/ec2-user/lawtalk/backend && npx drizzle-kit push`

## Assumptions

| Topic | Assumption |
|-------|-----------|
| Region | `us-east-1` throughout |
| AMI | Latest Amazon Linux 2023 via SSM parameter |
| RDS Multi-AZ | Off by default (set `MultiAZ=true` for production) |
| EC2 instance type | `t3.small` – upgrade for production load |
| Frontend hosting | AWS Amplify Hosting (auto-builds on push, manages ACM cert + DNS) |
| Frontend subdomain | `www.yourdomain.com` |
| Backend subdomain | `api.yourdomain.com` (Route 53 record created manually post-deploy) |
| Socket.IO | ALB sticky sessions enabled (lb_cookie, 24 h) |
| Lambda email worker | Inline stub – replace with real package before going live |
| Cloudinary | Credentials stored in Secrets Manager; EC2 reads them at runtime |
| DB deletion policy | `Snapshot` – change to `Delete` only in dev environments |
