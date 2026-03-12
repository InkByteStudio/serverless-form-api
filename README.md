# serverless-form-api

A production-ready serverless contact form backend built with AWS SAM, Lambda, DynamoDB, and SES.

## Architecture

```
Browser ──POST──▶ API Gateway (HTTP API)
                       │
                       ▼
                   Lambda (submit)
                    │        │
                    ▼        ▼
               DynamoDB    SES ──▶ Notification Email
                            │
                            ▼
                     SES Bounce/Complaint
                            │
                            ▼
                    SNS Topic(s)
                            │
                            ▼
                   Lambda (bounceHandler)
                            │
                            ▼
                   Suppression Table
```

## Features

- **Multi-site support** — single deployment serves multiple sites/domains
- **Rate limiting** — per-email rate limiting (5 submissions/hour)
- **Honeypot spam protection** — hidden field traps bots without CAPTCHAs
- **Bounce & complaint suppression** — automatic SES bounce/complaint handling via SNS
- **CloudWatch monitoring** — metric filters and alarms for errors, bounces, and abuse
- **CORS** — configurable per-origin allow list
- **Security headers** — HSTS, X-Content-Type-Options, X-Frame-Options on every response
- **TTL cleanup** — submissions auto-expire from DynamoDB after 90 days

## Prerequisites

- AWS account with CLI configured (`aws configure`)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Node.js 22+
- A verified domain or email address in SES

## Quick Start

```bash
git clone https://github.com/inkbytestudio/serverless-form-api.git
cd serverless-form-api
npm install
cp samconfig.toml.example samconfig.toml   # edit with your values
npx tsc
sam build
sam deploy --guided
```

## Configuration

SAM parameters (set in `samconfig.toml` or via `--guided`):

| Parameter | Description | Default |
|-----------|-------------|---------|
| `AllowedOrigins` | Comma-separated CORS origins | `http://localhost:4321,http://localhost:8080` |
| `NotifyEmail` | Email for submission notifications | `admin@example.com` |
| `SesFromEmail` | Verified SES sender address | `noreply@example.com` |

## Project Structure

```
serverless-form-api/
├── template.yaml              # SAM infrastructure template
├── package.json
├── tsconfig.json
├── samconfig.toml.example     # Deploy config template
├── src/
│   ├── types.ts               # Shared TypeScript interfaces
│   ├── handlers/
│   │   ├── submit.ts          # POST /submissions handler
│   │   └── bounceHandler.ts   # SNS bounce/complaint processor
│   ├── config/
│   │   ├── schemas.ts         # Validation schemas per submission type
│   │   └── sites.ts           # Per-site configuration
│   ├── middleware/
│   │   ├── validate.ts        # Input validation
│   │   ├── rateLimit.ts       # Per-email rate limiting
│   │   └── notify.ts          # Email notification orchestration
│   ├── services/
│   │   ├── dynamo.ts          # DynamoDB operations
│   │   ├── ses.ts             # SES email sending
│   │   └── suppression.ts     # Bounce suppression list
│   └── utils/
│       └── response.ts        # HTTP response helpers with CORS
└── frontend/
    ├── index.html             # Example contact form page
    └── contact.js             # Frontend submission handler
```

## Adding a New Site

1. Add a new entry to `src/config/sites.ts`:

```typescript
secondsite: {
  name: "Second Site",
  notifyEmail: process.env.NOTIFY_EMAIL || "admin@example.com",
  allowedTypes: ["contact"],
  fromEmail: process.env.SES_FROM_EMAIL || "noreply@example.com",
  replyTo: "support@secondsite.com",
},
```

2. Add the site's origin to the `AllowedOrigins` parameter in `samconfig.toml`.

3. Rebuild and deploy: `npm run deploy`

## Adding a New Submission Type

1. Add a schema to `src/config/schemas.ts`:

```typescript
newsletter: {
  requiredDataFields: ["source"],
},
```

2. Add the type to the site's `allowedTypes` array in `src/config/sites.ts`.

3. Rebuild and deploy.

## Frontend Integration

1. Set `API_URL` in `frontend/contact.js` to your deployed API Gateway URL (from stack outputs).

2. The form includes a **honeypot field** (`#website`) — it's hidden from real users via CSS. Bots that fill it get a fake success response. Do not remove it.

3. The frontend is framework-agnostic vanilla JS. Adapt the `fetch` call to any framework — just POST JSON to `/submissions`:

```json
{
  "site": "myapp",
  "type": "contact",
  "email": "user@example.com",
  "data": { "name": "Jane", "message": "Hello!" }
}
```

## Post-Deployment Setup

### SES Configuration Set (Manual Step)

The SAM template creates SNS topics for bounces and complaints, but **you must manually wire them to SES**:

1. Open the [SES console](https://console.aws.amazon.com/ses/) → Configuration Sets.
2. Create a configuration set (or use an existing one).
3. Add an **Event destination** for **Bounces** → SNS topic → select the `ses-bounces` topic.
4. Add an **Event destination** for **Complaints** → SNS topic → select the `ses-complaints` topic.
5. Set this configuration set as the default, or specify it in your `SendEmailCommand`.

### SES Sandbox

New SES accounts start in **sandbox mode** — you can only send to verified email addresses. [Request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html) before going live.

## Testing

```bash
# Get the API URL from stack outputs
API_URL=$(aws cloudformation describe-stacks \
  --stack-name serverless-form-api \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

# Successful submission
curl -X POST "$API_URL/submissions" \
  -H "Content-Type: application/json" \
  -d '{
    "site": "myapp",
    "type": "contact",
    "email": "test@example.com",
    "data": { "name": "Test User", "message": "Hello from curl" }
  }'

# Validation error (missing required field)
curl -X POST "$API_URL/submissions" \
  -H "Content-Type: application/json" \
  -d '{ "site": "myapp", "type": "contact", "email": "test@example.com", "data": {} }'

# Rate limit test (6th request should return 429)
for i in {1..6}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/submissions" \
    -H "Content-Type: application/json" \
    -d '{
      "site": "myapp",
      "type": "contact",
      "email": "ratelimit-test@example.com",
      "data": { "name": "Test", "message": "Rate limit test" }
    }'
  echo ""
done
```

## Monitoring

Three CloudWatch alarms are configured:

| Alarm | Trigger |
|-------|---------|
| `FormApi-HighErrorRate` | > 10 errors in 5 minutes |
| `FormApi-HighBounceRate` | > 5 bounces in 1 hour |
| `FormApi-RateLimitAbuse` | > 20 rate limit hits in 5 minutes |

All alarms notify via the `form-api-alarms` SNS topic (subscribed to `NotifyEmail`).

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **CORS errors** | Ensure the requesting origin is in `AllowedOrigins`. Redeploy after changes. |
| **SES sandbox** | In sandbox mode, both sender and recipient must be verified. Request production access for real use. |
| **Rate limit (429)** | 5 submissions per email per hour. Wait or use a different email for testing. |
| **Lambda timeout** | Default is 30s. If SES is slow, check SES region and connectivity. |
| **Bounce handler not firing** | Verify the SES configuration set event destinations point to the correct SNS topics (manual step). |

## Cost

For ~1,000 submissions/month: **~$0.50/month**

- Lambda: free tier covers it
- API Gateway: ~$0.001/request
- DynamoDB: on-demand, pennies at this scale
- SES: $0.10 per 1,000 emails
- SNS: negligible
- CloudWatch: free tier covers basic metrics/alarms

## Tutorial

This repo is the companion code for the full step-by-step tutorial:

**[Deploy a Serverless Contact Form with AWS SAM, Lambda & DynamoDB](https://igotasite4that.com/tutorials/deploy-serverless-contact-form-aws-sam-lambda-dynamodb)**

## License

[MIT](LICENSE)
