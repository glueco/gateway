# SDK Integration Guide

This guide explains how to integrate with the Personal Resource Gateway using the `@glueco/sdk` and plugin packages.

## Installation

```bash
npm install @glueco/sdk @glueco/shared @glueco/plugin-llm-gemini @glueco/plugin-llm-groq @glueco/plugin-llm-openai @glueco/plugin-mail-resend
```

## Quick Start

### 1. Initialize the Gateway Client

```typescript
import { GatewayClient } from '@glueco/sdk';
import { BrowserKeyStorage, BrowserConfigStorage } from './storage';

const gateway = new GatewayClient({
  keyStorage: new BrowserKeyStorage(),
  configStorage: new BrowserConfigStorage(),
});
```

### 2. Connect to Gateway (Server-Side Pattern)

For security, the demo app uses a server-side connection pattern where PoP signing happens on the server:

```typescript
// Client initiates connection via server API
const response = await fetch('/api/connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pairingString: 'pair::https://your-proxy.vercel.app::abc123...',
    app: {
      name: 'My App',
      description: 'My amazing app',
      homepage: 'https://myapp.com',
    },
    requestedPermissions: [
      { resourceId: 'llm:groq', actions: ['chat.completions'] },
      { resourceId: 'llm:gemini', actions: ['chat.completions'] },
    ],
    redirectUri: 'https://myapp.com/callback',
  }),
});

const { approvalUrl, sessionToken, gatewayUrl } = await response.json();

// Store pending session before redirect (for same-tab flow)
localStorage.setItem('gateway:pending_session', JSON.stringify({
  sessionToken,
  gatewayUrl,
}));

// Redirect to approval (same tab)
window.location.href = approvalUrl;
```

### 3. Handle Callback

After approval, the user is redirected back with status params:

```typescript
// On page load, check for callback params
const params = new URLSearchParams(window.location.search);
const status = params.get('status');

if (status === 'approved') {
  const pending = JSON.parse(localStorage.getItem('gateway:pending_session'));
  
  // Fetch handle from server
  const statusRes = await fetch(
    `/api/connect/status?session=${pending.sessionToken}&gatewayUrl=${pending.gatewayUrl}`
  );
  const data = await statusRes.json();
  
  if (data.status === 'approved' && data.handle) {
    // Connection complete! Store connection info
    localStorage.setItem('gateway:connection', JSON.stringify({
      gatewayUrl: data.gatewayUrl,
      appId: data.appId,
      handle: data.handle,
      createdAt: new Date().toISOString(),
    }));
  }
  
  localStorage.removeItem('gateway:pending_session');
  // Clear URL params
  window.history.replaceState({}, '', window.location.pathname);
}
```

> **Note:** Default permission expiry is 1 hour from approval.

### 4. Use Typed Plugin Clients

```typescript
import { groq } from '@glueco/plugin-llm-groq/client';
import { gemini } from '@glueco/plugin-llm-gemini/client';

// Get transport from gateway client
const transport = await gateway.getTransport();

// Create typed clients
const groqClient = groq(transport);
const geminiClient = gemini(transport);

// Make typed requests
const response = await groqClient.chatCompletions({
  model: 'llama-3.1-8b-instant',
  messages: [{ role: 'user', content: 'Hello!' }],
  max_tokens: 100,
});

console.log(response.data.choices[0].message.content);
```

## Browser Storage

For browser environments, implement `KeyStorage` and `ConfigStorage` interfaces:

```typescript
import type { KeyStorage, ConfigStorage, KeyPair } from '@glueco/sdk';

export class BrowserKeyStorage implements KeyStorage {
  async load(): Promise<KeyPair | null> {
    const stored = localStorage.getItem('gateway:keys');
    return stored ? JSON.parse(stored) : null;
  }

  async save(keyPair: KeyPair): Promise<void> {
    localStorage.setItem('gateway:keys', JSON.stringify(keyPair));
  }

  async delete(): Promise<void> {
    localStorage.removeItem('gateway:keys');
  }
}

export class BrowserConfigStorage implements ConfigStorage {
  async load(): Promise<GatewayConfig | null> {
    const stored = localStorage.getItem('gateway:config');
    return stored ? JSON.parse(stored) : null;
  }

  async save(config: GatewayConfig): Promise<void> {
    localStorage.setItem('gateway:config', JSON.stringify(config));
  }

  async delete(): Promise<void> {
    localStorage.removeItem('gateway:config');
  }
}
```

## Available Plugin Clients

| Package | Import | Client Factory |
|---------|--------|----------------|
| `@glueco/plugin-llm-gemini` | `@glueco/plugin-llm-gemini/client` | `gemini(transport)` |
| `@glueco/plugin-llm-groq` | `@glueco/plugin-llm-groq/client` | `groq(transport)` |
| `@glueco/plugin-llm-openai` | `@glueco/plugin-llm-openai/client` | `openai(transport)` |
| `@glueco/plugin-mail-resend` | `@glueco/plugin-mail-resend/client` | `resend(transport)` |

## Using Contract Types

Each plugin exports Zod-validated contract types:

```typescript
import { ChatCompletionRequestSchema } from '@glueco/plugin-llm-groq/contracts';

// Validate payload before sending
const result = ChatCompletionRequestSchema.safeParse(myPayload);
if (!result.success) {
  console.error('Invalid request:', result.error);
}
```

## Architecture

```
┌─────────────────┐     ┌───────────────┐     ┌─────────────────┐
│   Your App      │────▶│ GatewayClient │────▶│  Proxy Server   │
│                 │     │               │     │                 │
│  Plugin Client  │─────│  Transport    │─────│  Resource APIs  │
└─────────────────┘     └───────────────┘     └─────────────────┘
```

1. **GatewayClient**: Manages connection, keys, and PoP signing
2. **GatewayTransport**: Interface used by plugin clients for requests
3. **Plugin Clients**: Typed wrappers that call transport.request()
