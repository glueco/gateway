# Personal Resource Gateway

A monorepo for the Personal Resource Gateway (PRG) - a self-hosted proxy that gives applications controlled access to your API keys and resources.

## 🎯 Key Design Principles

- **Explicit Resource Selection** - No defaults, no inference. Every request must explicitly specify which resource to use.
- **Schema-First Enforcement** - Plugins validate requests using Zod schemas and extract enforcement fields during validation, not after.
- **Fail-Closed Policy** - If a constraint is defined but the corresponding enforcement field is missing, the request is rejected.

## 📦 Structure

```
/
├── apps/
│   └── proxy/              # Next.js gateway application (@glueco/proxy)
├── packages/
│   ├── sdk/                # Client SDK (@glueco/sdk) - publishable to npm
│   ├── shared/             # Shared types and utilities (@glueco/shared)
│   ├── plugin-llm-groq/    # Groq LLM plugin
│   ├── plugin-llm-gemini/  # Gemini LLM plugin
│   ├── plugin-llm-openai/  # OpenAI LLM plugin
│   └── plugin-template/    # Template for creating new plugins
├── examples/
│   └── demo-target-app/    # Example app showing SDK integration
└── scripts/
    ├── generate-enabled-plugins.mjs  # Plugin code generator
    └── smoke.mjs                     # End-to-end smoke tests
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up the Gateway

```bash
cd apps/proxy
cp .env.example .env
# Edit .env with your configuration

# Set up database
npx prisma migrate deploy
npx prisma generate

# Start development server
npm run dev
```

### 3. Run Demo App (Optional)

```bash
cd examples/demo-target-app
npm run dev
```

### 4. Run Smoke Tests

```bash
# With local gateway running on port 3000
npm run smoke:local

# With custom gateway URL
GATEWAY_URL=https://your-gateway.com npm run smoke

# Verbose output
npm run smoke:verbose
```

## 🔑 Resource Format

Resources use the format `resourceType:provider`:

| Resource ID   | Description       |
| ------------- | ----------------- |
| `llm:groq`    | Groq LLM API      |
| `llm:gemini`  | Google Gemini API |
| `llm:openai`  | OpenAI API        |
| `mail:resend` | Resend Email API  |

## 🛣️ API Endpoints

Resources are specified in the URL path:

```
/r/<resourceType>/<provider>/v1/chat/completions
```

Examples:

- `POST /r/llm/groq/v1/chat/completions` - Use Groq
- `POST /r/llm/gemini/v1/chat/completions` - Use Gemini
- `POST /r/llm/openai/v1/chat/completions` - Use OpenAI
- `POST /r/mail/resend/emails/send` - Send email via Resend

## 📚 SDK Usage

### Basic Usage with OpenAI SDK

```typescript
import { GatewayClient, FileKeyStorage, FileConfigStorage } from "@glueco/sdk";
import OpenAI from "openai";

const client = new GatewayClient({
  keyStorage: new FileKeyStorage("./.gateway/keys.json"),
  configStorage: new FileConfigStorage("./.gateway/config.json"),
});

// After connecting and approval...
const gatewayFetch = await client.getFetch();
const baseURL = await client.getResourceBaseUrl("llm", "groq");

const openai = new OpenAI({
  apiKey: "unused",
  baseURL, // https://gateway.example.com/r/llm/groq
  fetch: gatewayFetch,
});

const response = await openai.chat.completions.create({
  model: "llama-3.1-8b-instant",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### Using Typed Plugin Clients

```typescript
import { GatewayClient } from "@glueco/sdk";
import { groq } from "@glueco/plugin-llm-groq/client";
import { openai } from "@glueco/plugin-llm-openai/client";
import { resend } from "@glueco/plugin-mail-resend/client";

const client = new GatewayClient({ ... });
const transport = await client.getTransport();

// Typed Groq client
const groqClient = groq(transport);
const groqResponse = await groqClient.chatCompletions({
  model: "llama-3.3-70b-versatile",
  messages: [{ role: "user", content: "Hello!" }],
});

// Typed OpenAI client
const openaiClient = openai(transport);
const openaiResponse = await openaiClient.chatCompletions({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});

// Typed Resend email client
const mailClient = resend(transport);
const emailResponse = await mailClient.emails.send({
  from: "notifications@myapp.com",
  to: "user@example.com",
  subject: "Welcome!",
  html: "<h1>Welcome to our app!</h1>",
});
```

## 🔌 Plugin System

Resources are provided by plugins. Install a plugin package, add it to the config, and it appears in the gateway.

### Enabling a Plugin

1. **Install the plugin package:**

   ```bash
   npm install @glueco/plugin-llm-openai
   ```

2. **Add to `proxy.plugins.ts` in repository root:**

   ```typescript
   const enabledPlugins = [
     "@glueco/plugin-llm-groq",
     "@glueco/plugin-llm-gemini",
     "@glueco/plugin-llm-openai",
     // Add more plugins here
   ] as const;
   ```

3. **Rebuild and deploy:**
   ```bash
   npm run build
   ```

The plugin will appear in the discovery endpoint (`GET /api/resources`).

### Available Plugins

| Plugin                       | Resource ID   | Description                       |
| ---------------------------- | ------------- | --------------------------------- |
| `@glueco/plugin-llm-groq`    | `llm:groq`    | Groq LLM (OpenAI-compatible)      |
| `@glueco/plugin-llm-gemini`  | `llm:gemini`  | Google Gemini (OpenAI-compatible) |
| `@glueco/plugin-llm-openai`  | `llm:openai`  | OpenAI GPT models                 |
| `@glueco/plugin-mail-resend` | `mail:resend` | Resend transactional email        |

### Creating a Plugin

See `packages/plugin-template` for a starter template. A plugin must:

1. Export a default object implementing `PluginContract`
2. Define `id`, `resourceType`, `provider`, `version`, `name`, `actions`
3. Implement `validateAndShape()` returning enforcement fields
4. Implement `execute()`, `extractUsage()`, `mapError()`

```typescript
import type { PluginContract, EnforcementFields } from "@glueco/shared";
import { createPluginBase } from "@glueco/shared";

const myPlugin: PluginContract = {
  ...createPluginBase({
    id: "llm:myprovider",
    resourceType: "llm",
    provider: "myprovider",
    version: "1.0.0",
    name: "My Provider",
    actions: ["chat.completions"],
    supports: {
      enforcement: ["model", "max_tokens", "streaming"],
    },
  }),

  validateAndShape(action, input, constraints) {
    // Parse with Zod schema
    const parsed = MyRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { valid: false, error: parsed.error.message };
    }

    // Extract enforcement fields DURING validation
    const enforcement: EnforcementFields = {
      model: parsed.data.model,
      stream: parsed.data.stream ?? false,
      usesTools: parsed.data.tools?.length > 0,
      maxOutputTokens: parsed.data.max_tokens,
    };

    return { valid: true, shapedInput: parsed.data, enforcement };
  },

  // ... implement other methods
};

export default myPlugin;
```

### Schema-First Validation Flow

```
Request → Plugin.validateAndShape()
              ↓
     Schema validation (Zod)
              ↓
     Extract enforcement fields
              ↓
     Return { valid, shapedInput, enforcement }
              ↓
         Gateway enforcePolicy()
              ↓
     Check enforcement vs constraints
     (fail-closed: missing field = reject)
              ↓
         Plugin.execute()
```

### Discovery Endpoint

`GET /api/resources` returns all installed plugins:

```json
{
  "gateway": {
    "version": "1.0.0",
    "name": "Personal Resource Gateway"
  },
  "resources": [
    {
      "resourceId": "llm:groq",
      "actions": ["chat.completions"],
      "auth": { "pop": { "version": 1 } },
      "constraints": { "supports": ["model", "max_tokens", "streaming"] }
    }
  ]
}
```

## 🔐 Authentication

All requests require PoP (Proof-of-Possession) authentication via Ed25519 signatures:

| Header     | Description                            |
| ---------- | -------------------------------------- |
| `x-app-id` | App ID received after approval         |
| `x-ts`     | Unix timestamp (seconds)               |
| `x-nonce`  | Random 16-byte nonce (base64url)       |
| `x-sig`    | Ed25519 signature of canonical payload |

The SDK handles this automatically.

## 🛠️ Development

### Build All Packages

```bash
npm run build
```

This automatically:

1. Generates `enabled.generated.ts` from `proxy.plugins.ts`
2. Builds all workspace packages

### Build Only Plugins

```bash
npm run build:plugins
```

### Run Tests

```bash
npm test
```

### Run Smoke Tests

```bash
# Local development
npm run smoke:local

# Custom gateway URL
GATEWAY_URL=https://your-gateway.com npm run smoke

# Verbose output
npm run smoke:verbose
```

### Generate Plugin Imports Manually

```bash
npm run generate:plugins
```

## 📁 Environment Variables

### Gateway (apps/proxy)

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
ADMIN_SECRET=your-admin-secret
ENCRYPTION_KEY=32-byte-hex-key
NEXT_PUBLIC_APP_URL=https://your-gateway.com
MASTER_KEY=your-master-encryption-key
```

### Provider API Keys (registered via Admin UI)

```env
# LLM providers
GROQ_API_KEY=gsk_xxxxx
GEMINI_API_KEY=xxxxx
OPENAI_API_KEY=sk-xxxxx

# Email providers
RESEND_API_KEY=re_xxxxx
```

### Demo App (examples/demo-target-app)

The demo app stores credentials in `.gateway/` directory. No environment variables required for development.

## 📦 Project Structure

```
/
├── proxy.plugins.ts              # Enabled plugins config
├── scripts/
│   ├── generate-enabled-plugins.mjs  # Plugin import generator
│   └── smoke.mjs                     # E2E smoke tests
├── apps/
│   └── proxy/                    # Next.js gateway application
│       └── src/server/
│           ├── gateway/          # Pipeline & enforcement
│           └── plugins/          # Plugin registry
├── packages/
│   ├── shared/                   # Shared types (PluginContract, EnforcementFields)
│   ├── sdk/                      # Client SDK
│   ├── plugin-llm-groq/          # Groq plugin
│   ├── plugin-llm-gemini/        # Gemini plugin
│   ├── plugin-llm-openai/        # OpenAI plugin
│   ├── plugin-mail-resend/       # Resend email plugin
│   └── plugin-template/          # Template for new plugins
├── examples/
│   └── demo-target-app/          # System Check tester app
└── docs/
    └── PACKAGE_ARCHITECTURE.md   # Detailed architecture docs
```

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Smoke Tests

The smoke test script validates:

- Discovery endpoint returns enabled resources
- Schema validation rejects invalid requests (422)
- Unknown resources return 404
- Authentication is required (401)
- Policy enforcement blocks unauthorized models

```bash
npm run smoke:local
```

## 📝 License

MIT
