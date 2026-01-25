# Personal Resource Gateway

A monorepo for the Personal Resource Gateway (PRG) - a self-hosted proxy that gives AI applications controlled access to your API keys and resources.

## 🎯 Key Design Principle

**Explicit Resource Selection** - No defaults, no inference. Every request must explicitly specify which resource to use.

## 📦 Structure

```
/
├── apps/
│   └── proxy/          # Next.js gateway application (@glueco/proxy)
├── packages/
│   ├── sdk/            # Client SDK (@glueco/sdk) - publishable to npm
│   └── shared/         # Shared types and utilities (@glueco/shared)
└── examples/
    └── demo-target-app/  # Example app showing SDK integration
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

## 🔑 Resource Format

Resources use the format `resourceType:provider`:

| Resource ID  | Description       |
| ------------ | ----------------- |
| `llm:groq`   | Groq LLM API      |
| `llm:gemini` | Google Gemini API |

## 🛣️ API Endpoints

### New Routing Convention (Recommended)

Resources are specified in the URL path:

```
/r/<resourceType>/<provider>/v1/chat/completions
```

Examples:

- `POST /r/llm/groq/v1/chat/completions` - Use Groq
- `POST /r/llm/gemini/v1/chat/completions` - Use Gemini

### Legacy Endpoint

The `/v1/chat/completions` endpoint requires an explicit header:

```
x-gateway-resource: llm:groq
```

**Note**: This endpoint will NOT infer the resource from the model name.

## 📚 SDK Usage

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

## � Plugin System

Resources are provided by plugins. Install a plugin package, add it to the config, and it appears in the gateway.

### Enabling a Plugin

1. **Install the plugin package:**

   ```bash
   npm install @glueco/plugin-llm-groq
   ```

2. **Add to `proxy.plugins.ts` in repository root:**

   ```typescript
   const enabledPlugins = [
     "@glueco/plugin-llm-groq",
     "@glueco/plugin-llm-gemini",
     // Add more plugins here
   ] as const;
   ```

3. **Rebuild and deploy:**
   ```bash
   npm run build
   ```

The plugin will appear in the discovery endpoint (`GET /api/resources`).

### Available Plugins

| Plugin                      | Resource ID  | Description                       |
| --------------------------- | ------------ | --------------------------------- |
| `@glueco/plugin-llm-groq`   | `llm:groq`   | Groq LLM (OpenAI-compatible)      |
| `@glueco/plugin-llm-gemini` | `llm:gemini` | Google Gemini (OpenAI-compatible) |

### Creating a Plugin

See `packages/plugin-template` for a starter template. A plugin must:

1. Export a default object implementing `PluginContract`
2. Define `id`, `resourceType`, `provider`, `version`, `name`, `actions`
3. Implement `validateAndShape()`, `execute()`, `extractUsage()`, `mapError()`

```typescript
import { createPluginBase, PluginContract } from "@glueco/shared";

const myPlugin: PluginContract = {
  ...createPluginBase({
    id: "llm:myprovider",
    resourceType: "llm",
    provider: "myprovider",
    version: "1.0.0",
    name: "My Provider",
    actions: ["chat.completions"],
  }),
  // ... implement methods
};

export default myPlugin;
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

### Run Tests

```bash
npm test
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
```

### Demo App (examples/demo-target-app)

The demo app stores credentials in `.gateway/` directory. No environment variables required for development.

## 📦 Project Structure

```
/
├── proxy.plugins.ts          # Enabled plugins config
├── scripts/
│   └── generate-enabled-plugins.mjs  # Plugin import generator
├── apps/
│   └── proxy/                # Next.js gateway application
│       └── src/server/plugins/  # Plugin registry
├── packages/
│   ├── shared/               # Shared types (PluginContract)
│   ├── sdk/                  # Client SDK
│   ├── plugin-llm-groq/      # Groq plugin
│   ├── plugin-llm-gemini/    # Gemini plugin
│   └── plugin-template/      # Template for new plugins
└── examples/
    └── demo-target-app/      # System Check tester app
```

## 📝 License

MIT
