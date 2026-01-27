# @glueco/sdk

Client SDK for Personal Resource Gateway. Provides PoP (Proof-of-Possession) authentication and seamless integration with vendor SDKs like OpenAI.

## Installation

```bash
npm install @glueco/sdk
```

## Key Features

- **Explicit Resource Selection**: No magic defaults - you explicitly specify which resource to use
- **PoP Authentication**: Ed25519-based request signing for secure, keyless authentication
- **SDK Compatibility**: Works with OpenAI SDK and other HTTP clients
- **Flexible Storage**: File, memory, or environment-based key storage

## Resource Format

Resources are identified using the format `resourceType:provider`:

- `llm:groq` - Groq LLM
- `llm:gemini` - Google Gemini
- `mail:resend` - Resend email
- etc.

## Quick Start

### 1. Connect to Gateway

```typescript
import { GatewayClient, FileKeyStorage, FileConfigStorage } from "@glueco/sdk";

const client = new GatewayClient({
  keyStorage: new FileKeyStorage("./.gateway/keys.json"),
  configStorage: new FileConfigStorage("./.gateway/config.json"),
});

// Check if already connected
if (!(await client.isConnected())) {
  const result = await client.connect({
    pairingString: "pair::https://gateway.example.com::abc123...",
    app: {
      name: "My App",
      description: "Example application",
    },
    // Explicitly request specific resources
    requestedPermissions: [
      { resourceId: "llm:groq", actions: ["chat.completions"] },
      { resourceId: "llm:gemini", actions: ["chat.completions"] },
    ],
    redirectUri: "https://myapp.com/callback",
  });

  // Redirect user to approval URL
  console.log("Redirect to:", result.approvalUrl);
}
```

### 2. Handle Callback

```typescript
// After user approves, they're redirected back with query params
const params = new URLSearchParams(window.location.search);
const result = await client.handleCallback(params);

if (result.approved) {
  console.log("Connected! App ID:", result.appId);
}
```

### 3. Use with OpenAI SDK

```typescript
import OpenAI from "openai";

const gatewayFetch = await client.getFetch();

// Note: Resource is specified in the baseURL, not inferred from model
const baseURL = await client.getResourceBaseUrl("llm", "groq");
// Returns: https://gateway.example.com/r/llm/groq

const openai = new OpenAI({
  apiKey: "unused", // Gateway provides the key
  baseURL,
  fetch: gatewayFetch,
});

const completion = await openai.chat.completions.create({
  model: "llama-3.1-8b-instant",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### 4. Use Typed Plugin Clients

For full TypeScript support without vendor SDKs, use plugin client wrappers:

```typescript
import { groq } from "@glueco/plugin-llm-groq/client";
import { openai } from "@glueco/plugin-llm-openai/client";
import { GatewayClient } from "@glueco/sdk";

const client = new GatewayClient({ ... });
const transport = await client.getTransport();

// Typed Groq client
const groqClient = groq(transport);
const response = await groqClient.chatCompletions({
  model: "llama-3.3-70b-versatile",
  messages: [{ role: "user", content: "Hello!" }],
  temperature: 0.7,
});

// Typed OpenAI client
const openaiClient = openai(transport);
const response2 = await openaiClient.chatCompletions({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});

// Streaming
const stream = await groqClient.chatCompletionsStream({
  model: "llama-3.3-70b-versatile",
  messages: [{ role: "user", content: "Tell me a story" }],
});
```

## GatewayTransport

The `GatewayTransport` interface allows plugin clients to make typed requests:

```typescript
interface GatewayTransport {
  // Make a JSON request
  request<TResponse, TRequest>(
    pluginId: string, // "llm:groq"
    action: string, // "chat.completions"
    body: TRequest,
    options?: GatewayRequestOptions,
  ): Promise<GatewayResponse<TResponse>>;

  // Make a streaming request
  requestStream(
    pluginId: string,
    action: string,
    body: unknown,
    options?: GatewayRequestOptions,
  ): Promise<GatewayStreamResponse>;
}

interface GatewayResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

interface GatewayStreamResponse {
  stream: ReadableStream<Uint8Array>;
  status: number;
  headers: Headers;
}
```

### Using Transport Directly

```typescript
const transport = await client.getTransport();

// Direct request without plugin client
const response = await transport.request<ChatResponse, ChatRequest>(
  "llm:groq",
  "chat.completions",
  {
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: "Hello!" }],
  },
);

console.log(response.data.choices[0].message.content);
```

## API Reference

### GatewayClient

High-level client that manages keys, config, and provides a simple interface.

```typescript
const client = new GatewayClient({
  keyStorage?: KeyStorage,      // Default: MemoryKeyStorage
  configStorage?: ConfigStorage, // Default: MemoryConfigStorage
  baseFetch?: typeof fetch,      // Custom fetch implementation
});

// Methods
await client.isConnected(): Promise<boolean>
await client.connect(options): Promise<ConnectResult>
await client.handleCallback(params): Promise<{ approved: boolean; appId?: string }>
await client.getFetch(): Promise<GatewayFetch>
await client.getTransport(): Promise<GatewayTransport>
await client.getProxyUrl(): Promise<string>
await client.getResourceBaseUrl(type, provider): Promise<string>
await client.getAppId(): Promise<string>
await client.disconnect(): Promise<void>
```

### createGatewayFetch

Low-level PoP-enabled fetch function.

```typescript
import { createGatewayFetch } from "@glueco/sdk";

const gatewayFetch = createGatewayFetch({
  appId: "clx123...",
  proxyUrl: "https://gateway.example.com",
  keyPair: { publicKey: "...", privateKey: "..." },
});
```

### Key Storage Options

```typescript
import { MemoryKeyStorage, FileKeyStorage, EnvKeyStorage } from "@glueco/sdk";

// In-memory (lost on restart)
new MemoryKeyStorage();

// File-based (persisted)
new FileKeyStorage("./.gateway/keys.json");

// Environment variables
new EnvKeyStorage("GATEWAY_PUBLIC_KEY", "GATEWAY_PRIVATE_KEY");
```

### Config Storage Options

```typescript
import {
  MemoryConfigStorage,
  FileConfigStorage,
  EnvConfigStorage,
} from "@glueco/sdk";

new MemoryConfigStorage();
new FileConfigStorage("./.gateway/config.json");
new EnvConfigStorage("GATEWAY_APP_ID", "GATEWAY_PROXY_URL");
```

## URL Patterns

The gateway uses explicit URL-based resource routing:

```
/r/<resourceType>/<provider>/v1/chat/completions
```

Examples:

- `/r/llm/groq/v1/chat/completions` - Groq chat
- `/r/llm/gemini/v1/chat/completions` - Gemini chat (translated to Gemini format)
- `/r/llm/openai/v1/chat/completions` - OpenAI chat

The legacy `/v1/chat/completions` endpoint requires an `x-gateway-resource` header.

## Environment Variables

For production deployments, you can use environment variables:

```env
GATEWAY_APP_ID=clx123...
GATEWAY_PROXY_URL=https://gateway.example.com
GATEWAY_PUBLIC_KEY=base64...
GATEWAY_PRIVATE_KEY=base64...
```

Then use `createGatewayFetchFromEnv()` or `EnvKeyStorage`/`EnvConfigStorage`.

## License

MIT
