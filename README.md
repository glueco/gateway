# Personal Resource Gateway

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node Version">
</p>

<p align="center">
  <strong>🔐 Safely share your API keys with applications — without ever exposing them.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#demo">Try Demo</a> •
  <a href="./docs/ADMIN_GUIDE.md">Deploy Guide</a>
</p>

---

## The Problem

You want to use AI-powered tools and applications, but they all ask for your API keys. Sharing keys is risky:

- 🚨 **No control** - Once shared, keys can be used without limits
- 📊 **No visibility** - You can't see how your keys are being used
- ⏰ **No expiration** - Keys remain valid until you manually revoke them
- 💸 **Cost risk** - Unexpected charges from unauthorized usage

## The Solution

Personal Resource Gateway acts as a **secure proxy** between applications and your API providers. You store your API keys once, then grant apps **controlled, time-limited access** through the gateway.

```
┌─────────────┐        ┌─────────────────┐        ┌─────────────────┐
│   Your App  │ ──────▶│  Your Gateway   │ ──────▶│  OpenAI/Groq/   │
│             │◀────── │  (with your     │◀────── │  Gemini/etc     │
│  (no keys)  │        │   API keys)     │        │                 │
└─────────────┘        └─────────────────┘        └─────────────────┘
```

---

## Features

### 🔐 Secure Key Storage

Your API keys are encrypted at rest and never exposed to connected applications.

### ⏱️ Time-Limited Access

Grant access for 1 hour, 1 day, 1 week, or any custom duration. Permissions auto-expire.

### 🎛️ Fine-Grained Control

- **Model restrictions** - Allow only specific AI models
- **Rate limits** - Requests per minute/hour
- **Quotas** - Daily/monthly request caps
- **Token budgets** - Limit LLM token usage

### 📊 Usage Monitoring

Track exactly how each app uses your resources — requests, tokens, models, and more.

### 🔌 Multi-Provider Support

One gateway, many providers:

- **LLM**: OpenAI, Groq, Google Gemini
- **Email**: Resend
- **More coming**: Custom plugins easy to create

### 🛡️ Cryptographic Authentication

PoP (Proof-of-Possession) authentication ensures only authorized apps can make requests.

---

## How It Works

### 1. Deploy Your Gateway

One-click deploy to Vercel with Neon (PostgreSQL) and Upstash (Redis).

### 2. Add Your API Keys

Securely store keys for OpenAI, Groq, Gemini, Resend, etc.

### 3. Generate Pairing Strings

Create one-time pairing strings (valid 10 minutes) for apps you want to connect.

### 4. Approve Access Requests

When an app connects, review and approve what resources it can access, for how long, with what limits.

### 5. Monitor Usage

Watch real-time usage stats. Revoke access anytime.

---

## Quick Start

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/glueco/gateway)

See the [Admin Deployment Guide](./docs/ADMIN_GUIDE.md) for detailed setup instructions.

### Local Development

```bash
# Clone repository
git clone https://github.com/glueco/gateway.git
cd gateway

# Install dependencies
npm install

# Set up environment (copy and edit .env)
cd apps/proxy
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

---

## Demo

Try the gateway with our demo application:

🔗 **Demo App**: [demo-target-app.vercel.app](https://demo-target-app.vercel.app)

The demo app demonstrates:

- Connecting to a gateway using pairing strings
- Making authenticated API requests
- Testing LLM endpoints through the proxy

---

## For App Developers

### Using the SDK

Install the SDK in your application:

```bash
npm install @glueco/sdk
```

Connect and make requests:

```typescript
import { GatewayClient, FileKeyStorage, FileConfigStorage } from "@glueco/sdk";

const client = new GatewayClient({
  keyStorage: new FileKeyStorage("./.gateway/keys.json"),
  configStorage: new FileConfigStorage("./.gateway/config.json"),
});

// Connect using a pairing string from the gateway admin
await client.connect(pairingString, {
  app: {
    name: "My AI App",
    description: "An app that uses AI",
    homepage: "https://myapp.com",
  },
  permissions: [{ resourceId: "llm:groq", actions: ["chat.completions"] }],
  duration: { type: "preset", preset: "1_hour" },
});

// Make requests (keys are NEVER in your app)
const transport = await client.getTransport();
const response = await transport.fetch("/r/llm/groq/v1/chat/completions", {
  method: "POST",
  body: JSON.stringify({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: "Hello!" }],
  }),
});
```

### Using with OpenAI SDK

The gateway is OpenAI-compatible, so you can use the official OpenAI SDK:

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "unused", // The gateway handles auth
  baseURL: await client.getResourceBaseUrl("llm", "groq"),
  fetch: await client.getFetch(), // Use gateway's authenticated fetch
});

const completion = await openai.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [{ role: "user", content: "Hello!" }],
});
```

---

## Supported Resources

| Resource ID   | Provider | Description         |
| ------------- | -------- | ------------------- |
| `llm:openai`  | OpenAI   | GPT-4, GPT-3.5      |
| `llm:groq`    | Groq     | Llama 3.x, Mixtral  |
| `llm:gemini`  | Google   | Gemini 1.5/2.0      |
| `mail:resend` | Resend   | Transactional email |

---

## Documentation

| Document                                             | Description                    |
| ---------------------------------------------------- | ------------------------------ |
| [Admin Guide](./docs/ADMIN_GUIDE.md)                 | Deploy and manage your gateway |
| [Developer Guide](./docs/DEVELOPER_GUIDE.md)         | Build apps with the SDK        |
| [Adding Plugins](./docs/ADDING_PLUGINS.md)           | Enable resource plugins        |
| [Plugin Development](./docs/PACKAGE_ARCHITECTURE.md) | Create custom plugins          |
| [API Reference](./docs/API_REFERENCE.md)             | Gateway API endpoints          |

---

## Project Structure

```
├── apps/proxy/           # Next.js gateway application
├── packages/
│   ├── sdk/              # Client SDK for apps
│   ├── shared/           # Shared types and contracts
│   ├── plugin-llm-*/     # LLM provider plugins
│   └── plugin-mail-*/    # Email provider plugins
├── examples/
│   └── demo-target-app/  # Demo application
└── docs/                 # Documentation
```

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## Security

Found a vulnerability? Please report it privately to security@example.com.

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  Built with ❤️ for developers who value security and control.
</p>
