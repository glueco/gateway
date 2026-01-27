# Admin Deployment Guide

Complete guide to deploying and managing your Personal Resource Gateway. This guide covers deploying to Vercel with Neon (PostgreSQL) and Upstash (Redis) databases.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Deploy](#quick-deploy)
4. [Manual Deployment](#manual-deployment)
   - [Step 1: Fork/Clone Repository](#step-1-forkclone-repository)
   - [Step 2: Set Up Vercel](#step-2-set-up-vercel)
   - [Step 3: Configure Neon Database](#step-3-configure-neon-database)
   - [Step 4: Configure Upstash Redis](#step-4-configure-upstash-redis)
   - [Step 5: Set Environment Variables](#step-5-set-environment-variables)
   - [Step 6: Deploy](#step-6-deploy)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Adding API Keys](#adding-api-keys)
7. [Connecting Applications](#connecting-applications)
8. [Managing Permissions](#managing-permissions)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)
11. [Security Best Practices](#security-best-practices)

---

## Overview

The Personal Resource Gateway is a self-hosted proxy that gives applications controlled, time-limited access to your API keys. Think of it as a secure "vault" for your API credentials that you can share with apps without ever exposing the actual keys.

**Key Features:**
- 🔐 **Secure Key Storage** - API keys encrypted at rest
- ⏱️ **Time-Limited Access** - Permissions auto-expire
- 📊 **Usage Tracking** - Monitor API usage per app
- 🎛️ **Fine-Grained Control** - Model restrictions, rate limits, quotas
- 🔌 **Plugin System** - Support for multiple providers (OpenAI, Groq, Gemini, Resend)

---

## Prerequisites

Before starting, you'll need:

- [ ] A [Vercel](https://vercel.com) account (free tier works)
- [ ] A [Neon](https://neon.tech) account (free tier available)
- [ ] An [Upstash](https://upstash.com) account (free tier available)
- [ ] API keys for the services you want to proxy (e.g., OpenAI, Groq)
- [ ] Node.js 18+ (for local development)

---

## Quick Deploy

The fastest way to deploy is using Vercel's one-click deploy:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/glueco/gateway)

This will:
1. Fork the repository to your GitHub account
2. Create a new Vercel project
3. Guide you through setting up environment variables

After clicking, follow the prompts to add your database URLs and secrets.

---

## Manual Deployment

### Step 1: Fork/Clone Repository

```bash
# Clone the repository
git clone https://github.com/glueco/gateway.git personal-gateway
cd personal-gateway

# Install dependencies
npm install
```

### Step 2: Set Up Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your forked/cloned repository
4. **IMPORTANT**: Set the Root Directory to `apps/proxy`

```
Root Directory: apps/proxy
```

5. Don't deploy yet - you need to configure environment variables first

### Step 3: Configure Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project (free tier is sufficient)
3. Select a region close to your Vercel deployment
4. Once created, copy the connection string:

```
postgresql://username:password@ep-example-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Pro Tips:**
- Use the **pooled connection** string for better performance
- Enable **Autoscaling** for production workloads
- The free tier includes 0.5 GB storage and 1 compute hour/month

### Step 4: Configure Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com)
2. Create a new Redis database
3. Select a region close to your Vercel deployment
4. Copy the connection details:

```
REDIS_URL=https://xxxxxxxxx.upstash.io
REDIS_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxA
```

**Or use the REST URL format:**
```
UPSTASH_REDIS_REST_URL=https://xxxxxxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxA
```

**Pro Tips:**
- Enable **TLS** for security (default on Upstash)
- Use **Eviction** policy `noeviction` for reliable rate limiting
- The free tier includes 10,000 commands/day

### Step 5: Set Environment Variables

In Vercel, go to your project → **Settings** → **Environment Variables**

Add the following:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `REDIS_URL` | Upstash Redis URL | `redis://default:token@host:port` |
| `ADMIN_SECRET` | Secret for admin login (generate a strong one!) | `your-super-secret-admin-password` |
| `ENCRYPTION_KEY` | 32-byte hex key for encrypting API keys | `0123456789abcdef...` (64 chars) |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL | `https://gateway.yourdomain.com` |
| `MASTER_KEY` | Master encryption key | `another-32-byte-hex-key` |

**Generate a secure ENCRYPTION_KEY:**

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

### Step 6: Deploy

1. In Vercel, click **"Deploy"**
2. Wait for the build to complete
3. Run database migrations:

**Option A: Via Vercel Functions (Recommended)**
```bash
# The first deployment will auto-run migrations via prisma migrate deploy
```

**Option B: Local Migration**
```bash
# Set DATABASE_URL in your local .env
DATABASE_URL="your-neon-connection-string"

# Run migrations
cd apps/proxy
npx prisma migrate deploy
```

---

## Post-Deployment Configuration

### First Login

1. Navigate to your deployed gateway URL
2. Enter your `ADMIN_SECRET` to log in
3. You'll see the dashboard with three tabs:
   - **Apps** - Connected applications
   - **Resources** - Configured API providers
   - **Generate Pairing** - Create pairing strings

### Initial Setup Checklist

- [ ] Successfully logged into admin dashboard
- [ ] Added at least one resource (API provider)
- [ ] Generated a test pairing string
- [ ] Connected a test application

---

## Adding API Keys

Navigate to **Resources** tab and click **"Add Resource"**:

### LLM Providers

| Provider | Resource ID | API Key Format |
|----------|-------------|----------------|
| OpenAI | `llm:openai` | `sk-...` |
| Groq | `llm:groq` | `gsk_...` |
| Google Gemini | `llm:gemini` | AIzaSy... |

### Email Providers

| Provider | Resource ID | API Key Format |
|----------|-------------|----------------|
| Resend | `mail:resend` | `re_...` |

**Security Note:** API keys are encrypted before storage using your `ENCRYPTION_KEY`. They are never exposed in the UI or API responses.

---

## Connecting Applications

### For App Developers

1. **Admin generates a pairing string** (valid for 10 minutes)
2. **App uses pairing string** to initiate connection:

```typescript
import { GatewayClient } from "@glueco/sdk";

const client = new GatewayClient({
  keyStorage: new FileKeyStorage("./.gateway/keys.json"),
  configStorage: new FileConfigStorage("./.gateway/config.json"),
});

// Connect using pairing string
await client.connect(pairingString, {
  app: {
    name: "My App",
    description: "My awesome application",
    homepage: "https://myapp.com",
  },
  permissions: [
    {
      resourceId: "llm:groq",
      actions: ["chat.completions"],
    },
  ],
  duration: { type: "preset", preset: "1_hour" },
});
```

3. **Admin approves** on the gateway approval page
4. **App receives credentials** and can start making requests

### Testing with Demo App

We provide a demo app to test your gateway:

**Live Demo:** [https://demo-target-app.vercel.app](https://demo-target-app.vercel.app)

1. Enter your gateway URL in the demo app
2. Paste the pairing string
3. Request LLM access
4. Approve on your gateway
5. Test API calls

---

## Managing Permissions

### Permission Options

When approving a connection, you can configure:

| Setting | Description |
|---------|-------------|
| **Duration** | How long access lasts (1 hour to forever) |
| **Allowed Models** | Which AI models the app can use |
| **Rate Limit** | Requests per time window |
| **Daily Quota** | Max requests per day |
| **Monthly Quota** | Max requests per month |
| **Token Budget** | Max tokens (input + output) per period |

### Modifying Permissions

From the dashboard:
1. Click on an app in the **Apps** tab
2. Click **"Edit"** 
3. Modify permission settings
4. Click **"Save Changes"**

### Revoking Access

Two options:
- **Revoke Permission** - Remove specific resource access
- **Suspend App** - Temporarily disable all access
- **Delete App** - Permanently remove app and all permissions

---

## Monitoring & Maintenance

### Usage Statistics

The dashboard shows per-app statistics:
- Total requests (7-day rolling)
- Token usage by model
- Daily request breakdown

### Database Maintenance

**Neon:**
- Auto-scales compute based on load
- Point-in-time recovery available
- Monitor from Neon dashboard

**Upstash:**
- Monitor command usage
- Set up alerts for quota limits

### Log Monitoring

Check Vercel deployment logs for:
- Request errors
- Policy violations
- Authentication failures

---

## Troubleshooting

### Common Issues

#### "Invalid or expired session"
- Pairing strings expire after 10 minutes
- Generate a new one from the dashboard

#### "Permission expired"
- The app's access duration has ended
- Re-approve with a new pairing string or extend via dashboard

#### "Model not allowed"
- The requested model isn't in the permission's allowed list
- Edit the permission to add the model

#### "Rate limit exceeded"
- App has hit its configured rate limit
- Wait for the window to reset or increase limits

#### Database Connection Issues
```
Error: Can't reach database server
```
- Verify `DATABASE_URL` is correct
- Check Neon project status
- Ensure IP isn't blocked (Neon allows all IPs by default)

#### Redis Connection Issues
```
Error: Redis connection failed
```
- Verify `REDIS_URL` format
- Check Upstash dashboard for connection limits
- Ensure TLS is properly configured

### Debug Mode

For verbose logging during development:
```bash
VERBOSE=true npm run dev
```

---

## Security Best Practices

### Environment Variables

- ✅ Use strong, unique values for `ADMIN_SECRET`
- ✅ Generate cryptographically secure `ENCRYPTION_KEY`
- ✅ Never commit `.env` files to version control
- ✅ Rotate secrets periodically

### Network Security

- ✅ Always use HTTPS (Vercel provides this automatically)
- ✅ Use Neon's pooled connections with SSL
- ✅ Enable Upstash TLS

### Access Control

- ✅ Use short permission durations when possible
- ✅ Restrict models to only what's needed
- ✅ Set appropriate rate limits
- ✅ Monitor usage for anomalies

### API Key Hygiene

- ✅ Use separate API keys for the gateway (not your main keys)
- ✅ Set spending limits on provider accounts
- ✅ Regularly audit connected apps

---

## Updating the Gateway

To update to the latest version:

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Rebuild
npm run build

# Vercel auto-deploys on push to main
git push
```

---

## Support

- **Documentation:** [docs/](./docs/)
- **Issues:** [GitHub Issues](https://github.com/glueco/gateway/issues)
- **Demo App:** Test your setup with the [demo app](https://demo-target-app.vercel.app)

---

## Appendix: Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `ADMIN_SECRET` | ✅ | Admin login password |
| `ENCRYPTION_KEY` | ✅ | 32-byte hex key for encryption |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL of your gateway |
| `MASTER_KEY` | ✅ | Master encryption key |
| `NODE_ENV` | ❌ | `production` for deployed instances |

---

*Last updated: January 2026*
