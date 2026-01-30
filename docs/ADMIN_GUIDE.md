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
- [ ] A [GitHub](https://github.com) account (to fork the repository)
- [ ] API keys for the services you want to proxy (e.g., OpenAI, Groq)

> **Note:** Neon (PostgreSQL) and Upstash (Redis) will be provisioned directly through Vercel's Storage tab - no separate accounts needed!

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

## Manual Deployment (Recommended)

### Step 1: Fork the Repository

1. Go to [github.com/glueco/gateway](https://github.com/glueco/gateway)
2. Click **"Fork"** in the top right
3. This creates a copy in your GitHub account

### Step 2: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Find and select your forked `gateway` repository
5. **IMPORTANT**: Configure project settings:
   - Set **Root Directory** to `apps/proxy`
   - Framework Preset: Next.js (auto-detected)
6. **Don't deploy yet** - click **"Cancel"** or wait, we need to set up databases first

### Step 3: Add Neon Database (via Vercel Storage)

Vercel integrates directly with Neon - no separate Neon account needed!

1. In your Vercel project, go to the **"Storage"** tab
2. Click **"Create Database"**
3. Select **"Neon Serverless Postgres"**
4. Choose a region (pick one close to you, e.g., `us-east-1`)
5. Click **"Create"**

Vercel automatically:

- Creates a Neon database
- Adds `DATABASE_URL` and related environment variables to your project

### Step 4: Add Upstash Redis (via Vercel Storage)

1. Still in the **"Storage"** tab
2. Click **"Create Database"** again
3. Select **"Upstash KV"** (Redis-compatible)
4. Choose a region (same as your Neon database)
5. Click **"Create"**

Vercel automatically:

- Creates an Upstash Redis database
- Adds `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` environment variables

> **Note:** The gateway uses `REDIS_URL`. You may need to add this manually pointing to the Upstash URL, or the code can be configured to use `KV_REST_API_URL`.

### Step 5: Set Remaining Environment Variables

Go to your project → **Settings** → **Environment Variables**

The database URLs are already set from Steps 3-4. Add these additional variables:

| Variable              | Description                                     | Example                            |
| --------------------- | ----------------------------------------------- | ---------------------------------- |
| `ADMIN_SECRET`        | Secret for admin login (generate a strong one!) | `your-super-secret-admin-password` |
| `ENCRYPTION_KEY`      | 32-byte hex key for encrypting API keys         | `0123456789abcdef...` (64 chars)   |
| `GATEWAY_URL` | Your deployed URL (set after first deploy)      | `https://gateway.yourdomain.com`   |
| `MASTER_KEY`          | Master encryption key                           | `another-32-byte-hex-key`          |

**Generate secure keys:**

Use a random key generator to create 64-character hex strings. Online tools like [generate.plus/hex](https://generate.plus/en/hex) or password generators work well. Generate two separate keys - one for `ENCRYPTION_KEY` and one for `MASTER_KEY`.

### Step 6: Deploy

1. Go to the **"Deployments"** tab in your Vercel project
2. Click **"Redeploy"** (or trigger a new deployment)
3. Wait for the build to complete (usually 1-2 minutes)
4. Your gateway is now live! 🎉

The first deployment automatically runs database migrations via `prisma migrate deploy`.

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

| Provider      | Resource ID  | API Key Format |
| ------------- | ------------ | -------------- |
| OpenAI        | `llm:openai` | `sk-...`       |
| Groq          | `llm:groq`   | `gsk_...`      |
| Google Gemini | `llm:gemini` | AIzaSy...      |

### Email Providers

| Provider | Resource ID   | API Key Format |
| -------- | ------------- | -------------- |
| Resend   | `mail:resend` | `re_...`       |

**Security Note:** API keys are encrypted before storage using your `ENCRYPTION_KEY`. They are never exposed in the UI or API responses.

---

## Connecting Applications

### For App Developers

1. **Admin generates a pairing string** (valid for 10 minutes)
2. **App uses pairing string** to initiate connection using the [@glueco/sdk](https://www.npmjs.com/package/@glueco/sdk) package
3. **Admin approves** on the gateway approval page
4. **App receives credentials** and can start making requests

For detailed SDK integration instructions, see the [Developer Guide](./DEVELOPER_GUIDE.md).

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

| Setting            | Description                               |
| ------------------ | ----------------------------------------- |
| **Duration**       | How long access lasts (1 hour to forever) |
| **Allowed Models** | Which AI models the app can use           |
| **Rate Limit**     | Requests per time window                  |
| **Daily Quota**    | Max requests per day                      |
| **Monthly Quota**  | Max requests per month                    |
| **Token Budget**   | Max tokens (input + output) per period    |

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

If you see "Can't reach database server" errors:

- Verify `DATABASE_URL` is correct in Vercel environment variables
- Check Neon project status in Vercel Storage tab
- Ensure IP isn't blocked (Neon allows all IPs by default)

#### Redis Connection Issues

If you see "Redis connection failed" errors:

- Verify `REDIS_URL` format in Vercel environment variables
- Check Upstash dashboard in Vercel Storage tab for connection limits
- Ensure TLS is properly configured

### Debug Mode

For verbose logging during local development, set `VERBOSE=true` in your environment variables.

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

1. Go to your forked repository on GitHub
2. Click **Sync fork** to pull the latest changes from the main repo
3. Vercel will automatically redeploy when your fork is updated

Alternatively, if you're comfortable with Git, pull the latest changes to your local repo and push to trigger a redeployment.

---

## Support

- **Documentation:** [docs/](./docs/)
- **Issues:** [GitHub Issues](https://github.com/glueco/gateway/issues)
- **Demo App:** Test your setup with the [demo app](https://demo-target-app.vercel.app)

---

## Appendix: Environment Variable Reference

| Variable              | Required | Description                                        | Set By                  |
| --------------------- | -------- | -------------------------------------------------- | ----------------------- |
| `DATABASE_URL`        | ✅       | PostgreSQL connection string                       | Vercel Storage          |
| `REDIS_URL`           | ✅       | Redis connection string (or use `KV_REST_API_URL`) | Vercel Storage / Manual |
| `ADMIN_SECRET`        | ✅       | Admin login password                               | Manual                  |
| `ENCRYPTION_KEY`      | ✅       | 32-byte hex key for encryption                     | Manual                  |
| `NEXT_PUBLIC_APP_URL` | ✅       | Public URL of your gateway                         | Manual                  |
| `MASTER_KEY`          | ✅       | Master encryption key                              | Manual                  |
| `POSTGRES_*`          | ❌       | Additional Neon variables (auto-set by Vercel)     | Vercel Storage          |
| `KV_*`                | ❌       | Upstash KV variables (auto-set by Vercel)          | Vercel Storage          |
| `NODE_ENV`            | ❌       | `production` for deployed instances                | Auto                    |

---

_Last updated: January 2026_
