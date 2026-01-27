# Package Architecture & Plugin Development Guide

This document outlines the complete package management policy, architecture, and step-by-step guide for creating new resource plugins for the Personal Resource Gateway.

---

## Table of Contents

1. [Monorepo Structure](#monorepo-structure)
2. [Core Packages](#core-packages)
   - [@glueco/shared](#gluecoshared)
   - [@glueco/sdk](#gluecosdk)
3. [Plugin System](#plugin-system)
   - [Dual-Entrypoint Architecture](#dual-entrypoint-architecture)
   - [Plugin Contract Interface](#plugin-contract-interface)
4. [Creating a New Plugin](#creating-a-new-plugin)
5. [Plugin Registration](#plugin-registration)
6. [Build System](#build-system)
7. [Naming Conventions](#naming-conventions)

---

## Monorepo Structure

```
personal-resource-gateway/
├── package.json            # Root workspace config
├── proxy.plugins.ts        # Plugin enablement config
├── apps/
│   └── proxy/              # Main gateway proxy (Next.js)
├── packages/
│   ├── shared/             # Shared types, schemas, contracts
│   ├── sdk/                # Client SDK for target apps
│   ├── plugin-template/    # Reference plugin implementation
│   ├── plugin-llm-groq/    # Groq LLM plugin
│   └── plugin-llm-gemini/  # Gemini LLM plugin
├── examples/
│   └── demo-target-app/    # Demo app for testing
└── scripts/
    └── generate-enabled-plugins.mjs  # Plugin code generator
```

### Workspace Configuration

Root `package.json`:

```json
{
  "workspaces": ["apps/*", "packages/*", "examples/*"]
}
```

All packages in `packages/` are automatically included in the npm workspace.

---

## Core Packages

### @glueco/shared

**Purpose:** Shared types, schemas, and contracts used by both the proxy and SDK.

**Location:** `packages/shared/`

**Exports:**

- Type definitions (`ResourceId`, `ResourceConstraints`, etc.)
- Zod schemas for validation
- Plugin contract interfaces (`PluginContract`, `PluginExecuteContext`, etc.)
- Access policy types
- Duration presets
- Error types

**Key Files:**

```
packages/shared/src/
├── index.ts          # Main export file
├── plugins.ts        # Plugin contract interfaces
├── schemas.ts        # Zod validation schemas
├── access-policy.ts  # Access policy types
├── enforcement.ts    # Enforcement types
├── errors.ts         # Error types
├── pop.ts            # PoP authentication types
└── duration-presets.ts
```

**Dependencies:** `zod`

**Build:** `tsup` → outputs CJS, ESM, and TypeScript declarations

---

### @glueco/sdk

**Purpose:** Client-side SDK for target applications to connect and communicate with the gateway.

**Location:** `packages/sdk/`

**Exports:**

- `GatewayClient` - High-level client class
- `GatewayTransport` - Transport interface for plugin clients
- Key generation and storage (`generateKeyPair`, `KeyStorage`)
- Connect/pairing utilities
- Error handling

**Key Files:**

```
packages/sdk/src/
├── index.ts      # Main exports
├── client.ts     # GatewayClient class
├── transport.ts  # Transport interface (used by plugins)
├── fetch.ts      # Fetch wrapper with PoP signing
├── keys.ts       # Key generation and storage
├── connect.ts    # Connect/pairing flow
├── pairing.ts    # Pairing string utilities
└── errors.ts     # SDK-specific errors
```

**Dependencies:**

- `@glueco/shared`
- `@noble/ed25519` - Ed25519 signing
- `@noble/hashes` - Hash functions

---

## Plugin System

### Schema-First Enforcement

The gateway uses a **schema-first** approach to policy enforcement:

1. **Plugin validates request** - Uses Zod schemas to parse and validate the raw request
2. **Extract enforcement fields** - During validation, plugins extract fields needed for policy checking
3. **Return enforcement with validation** - `validateAndShape()` returns `{ valid, shapedInput, enforcement }`
4. **Gateway enforces policy** - Checks enforcement fields against access policy constraints
5. **Fail-closed policy** - If a constraint exists but enforcement field is missing, request is rejected

```
Request Body
     ↓
Plugin.validateAndShape(action, rawBody, constraints)
     ↓
Zod Schema Validation → Extract EnforcementFields
     ↓
Return { valid: true, shapedInput, enforcement }
     ↓
Gateway.enforcePolicy(enforcement, accessPolicy)
     ↓
Check: model ∈ allowedModels?
       stream allowed?
       maxOutputTokens ≤ limit?
       tools allowed?
     ↓
Plugin.execute(action, shapedInput, ctx, options)
```

**Key Principles:**

- Enforcement fields are extracted **during** validation, not after
- If a constraint has a rule but enforcement field is `undefined`, request is **rejected** (fail-closed)
- No fallback extraction - plugins are the single source of truth for enforcement data

### Dual-Entrypoint Architecture

Plugins follow a **dual-entrypoint** architecture to maintain separation of concerns:

```
@glueco/plugin-xxx/
├── /proxy    → Server-side code (runs in gateway)
├── /client   → Client-side code (runs in target apps)
└── /contracts → Shared types and schemas
```

**Why Dual-Entrypoints?**

1. **Code Splitting:** Server code (Node.js) is separate from client code (browser-safe)
2. **Tree Shaking:** Target apps only bundle the `/client` code
3. **Type Safety:** Shared contracts ensure consistency
4. **Security:** Server secrets never leak to client bundles

### Plugin Contract Interface

Every plugin must implement the `PluginContract` interface from `@glueco/shared`:

```typescript
interface PluginContract {
  // Identity
  readonly id: string; // "resourceType:provider" e.g., "llm:groq"
  readonly resourceType: string; // "llm", "mail", "storage"
  readonly provider: string; // "groq", "gemini", "resend"
  readonly version: string; // "1.0.0"
  readonly name: string; // "Groq LLM Plugin"
  readonly actions: string[]; // ["chat.completions", "models.list"]

  // Configuration
  readonly auth: PluginAuth;
  readonly supports: PluginSupports;
  readonly credentialSchema?: PluginCredentialSchema;
  readonly client?: PluginClientContract;

  // Methods - Schema-First Pipeline
  validateAndShape(action, input, constraints): PluginValidationResult;
  // Returns: { valid, shapedInput?, enforcement?, error? }
  // The 'enforcement' field contains extracted fields for policy checking

  execute(action, shapedInput, ctx, options): Promise<PluginExecuteResult>;
  extractUsage(response): PluginUsageMetrics;
  mapError(error): PluginMappedError;
}

/**
 * Enforcement fields extracted during validation.
 * These are checked against access policy constraints.
 */
interface EnforcementFields {
  model?: string; // Model identifier
  stream?: boolean; // Whether streaming is requested
  usesTools?: boolean; // Whether tools/functions are used
  maxOutputTokens?: number; // Max output tokens requested
}
```

---

## Creating a New Plugin

### Step 1: Create Package Directory

Copy the template:

```bash
cp -r packages/plugin-template packages/plugin-xxx-yyy
```

Naming convention: `plugin-<resourceType>-<provider>`

### Step 2: Update package.json

```json
{
  "name": "@glueco/plugin-xxx-yyy",
  "version": "1.0.0",
  "description": "YYY plugin for Personal Resource Gateway",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./proxy": {
      "import": "./dist/proxy.mjs",
      "require": "./dist/proxy.js",
      "types": "./dist/proxy.d.ts"
    },
    "./client": {
      "import": "./dist/client.mjs",
      "require": "./dist/client.js",
      "types": "./dist/client.d.ts"
    },
    "./contracts": {
      "import": "./dist/contracts.mjs",
      "require": "./dist/contracts.js",
      "types": "./dist/contracts.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@glueco/shared": "*",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@glueco/sdk": "*",
    "tsup": "^8.0.1",
    "typescript": "^5.3.3"
  },
  "peerDependencies": {
    "@glueco/shared": ">=1.0.0",
    "@glueco/sdk": ">=1.0.0"
  },
  "peerDependenciesMeta": {
    "@glueco/sdk": {
      "optional": true
    }
  }
}
```

### Step 3: Configure tsup.config.ts

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    proxy: "src/proxy.ts",
    client: "src/client.ts",
    contracts: "src/contracts.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["@glueco/sdk", "@glueco/shared"],
});
```

### Step 4: Define Contracts (contracts.ts)

```typescript
import { z } from "zod";

// Request/Response Schemas
export const MyActionRequestSchema = z.object({
  input: z.string(),
  options: z
    .object({
      param1: z.boolean().optional(),
    })
    .optional(),
});

export type MyActionRequest = z.infer<typeof MyActionRequestSchema>;

export const MyActionResponseSchema = z.object({
  result: z.string(),
  metadata: z.object({
    processingTime: z.number(),
  }),
});

export type MyActionResponse = z.infer<typeof MyActionResponseSchema>;

// Plugin Constants
export const PLUGIN_ID = "xxx:yyy" as const;
export const RESOURCE_TYPE = "xxx" as const;
export const PROVIDER = "yyy" as const;
export const VERSION = "1.0.0";
export const NAME = "YYY Plugin for XXX";
export const ACTIONS = ["my.action", "another.action"] as const;
export const ENFORCEMENT_SUPPORT = ["allowedModels", "maxTokens"] as const;
export const DEFAULT_API_URL = "https://api.provider.com/v1";
```

### Step 5: Implement Proxy Plugin (proxy.ts)

```typescript
import type {
  PluginContract,
  PluginResourceConstraints,
  PluginValidationResult,
  PluginExecuteContext,
  PluginExecuteOptions,
  PluginExecuteResult,
  PluginUsageMetrics,
  PluginMappedError,
} from "@glueco/shared";
import { createPluginBase } from "@glueco/shared";

import {
  MyActionRequestSchema,
  PLUGIN_ID,
  RESOURCE_TYPE,
  PROVIDER,
  VERSION,
  NAME,
  ACTIONS,
  ENFORCEMENT_SUPPORT,
  DEFAULT_API_URL,
} from "./contracts";

// Error mapping
function mapProviderError(error: unknown): PluginMappedError {
  // Map provider-specific errors to standardized format
  // ...
}

const myPlugin: PluginContract = {
  ...createPluginBase({
    id: PLUGIN_ID,
    resourceType: RESOURCE_TYPE,
    provider: PROVIDER,
    version: VERSION,
    name: NAME,
    actions: [...ACTIONS],
    supports: {
      enforcement: [...ENFORCEMENT_SUPPORT],
    },
  }),

  validateAndShape(
    action: string,
    input: unknown,
    constraints: PluginResourceConstraints,
  ): PluginValidationResult {
    switch (action) {
      case "my.action": {
        const result = MyActionRequestSchema.safeParse(input);
        if (!result.success) {
          return { valid: false, error: result.error.message };
        }

        // Extract enforcement fields DURING validation (schema-first)
        const enforcement: EnforcementFields = {
          model: result.data.model,
          stream: result.data.stream ?? false,
          usesTools:
            Array.isArray(result.data.tools) && result.data.tools.length > 0,
          maxOutputTokens: result.data.max_tokens,
        };

        // Apply constraints and return with enforcement
        return { valid: true, shapedInput: result.data, enforcement };
      }
      default:
        return { valid: false, error: `Unknown action: ${action}` };
    }
  },

  async execute(
    action: string,
    shapedInput: unknown,
    ctx: PluginExecuteContext,
    options: PluginExecuteOptions,
  ): Promise<PluginExecuteResult> {
    const baseUrl = (ctx.config?.baseUrl as string) || DEFAULT_API_URL;

    // Make API call to provider...
    const response = await fetch(`${baseUrl}/endpoint`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shapedInput),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`Provider error: ${response.status}`);
    }

    const data = await response.json();

    return {
      response: data,
      contentType: "application/json",
      usage: this.extractUsage(data),
    };
  },

  extractUsage(response: unknown): PluginUsageMetrics {
    // Extract usage metrics from response
    return {};
  },

  mapError: mapProviderError,
};

export default myPlugin;
export { myPlugin };
```

### Step 6: Implement Client Wrapper (client.ts)

````typescript
import type {
  GatewayTransport,
  GatewayResponse,
  GatewayRequestOptions,
} from "@glueco/sdk";

import {
  type MyActionRequest,
  type MyActionResponse,
  PLUGIN_ID,
} from "./contracts";

// Re-export contracts
export * from "./contracts";

export interface MyPluginClient {
  myAction(
    request: MyActionRequest,
    options?: Omit<GatewayRequestOptions, "stream" | "method">,
  ): Promise<GatewayResponse<MyActionResponse>>;
}

/**
 * Create typed client from transport.
 *
 * @example
 * ```ts
 * import { myPlugin } from "@glueco/plugin-xxx-yyy/client";
 * import { GatewayClient } from "@glueco/sdk";
 *
 * const client = new GatewayClient({ ... });
 * const transport = await client.getTransport();
 * const typedClient = myPlugin(transport);
 *
 * const result = await typedClient.myAction({ input: "hello" });
 * ```
 */
export function myPlugin(transport: GatewayTransport): MyPluginClient {
  const [resourceType, provider] = PLUGIN_ID.split(":");

  return {
    async myAction(request, options = {}) {
      return transport.request<MyActionResponse>({
        resourceType,
        provider,
        path: "/my/action",
        method: "POST",
        body: request,
        ...options,
      });
    },
  };
}
````

### Step 7: Create Main Index (index.ts)

```typescript
// Re-export proxy plugin as default for backward compatibility
export { default } from "./proxy";
export { myPlugin as myPluginProxy } from "./proxy";

// Re-export contracts
export * from "./contracts";
```

---

## Plugin Registration

### Step 1: Enable Plugin

Edit `proxy.plugins.ts` in the root:

```typescript
const enabledPlugins = [
  "@glueco/plugin-llm-groq",
  "@glueco/plugin-llm-gemini",
  "@glueco/plugin-xxx-yyy", // Add your plugin
] as const;

export default enabledPlugins;
```

### Step 2: Build

Run build to generate the enabled plugins file:

```bash
npm run build
```

This triggers:

1. `npm run prebuild` → Runs `scripts/generate-enabled-plugins.mjs`
2. Generates `apps/proxy/src/server/plugins/enabled.generated.ts`
3. Builds all workspaces

### Generated File

The script creates:

```typescript
// AUTO-GENERATED FILE - DO NOT EDIT
import type { PluginContract } from "@glueco/shared";

import pluginLlmGroq from "@glueco/plugin-llm-groq/proxy";
import pluginLlmGemini from "@glueco/plugin-llm-gemini/proxy";
import pluginMailResend from "@glueco/plugin-mail-resend/proxy";
import pluginXxxYyy from "@glueco/plugin-xxx-yyy/proxy";

export const ENABLED_PLUGINS: PluginContract[] = [
  pluginLlmGroq,
  pluginLlmGemini,
  pluginMailResend,
  pluginXxxYyy,
];
```

---

## Mail Plugin Example (Resend)

The Resend plugin demonstrates how to implement a non-LLM resource with schema-first validation.

### Contract Definition

```typescript
// packages/plugin-mail-resend/src/contracts.ts
export const PLUGIN_ID = "mail:resend" as const;
export const RESOURCE_TYPE = "mail" as const;
export const PROVIDER = "resend" as const;
export const VERSION = "0.1.0";
export const ACTIONS = ["emails.send"] as const;

export const SendEmailRequestSchema = z
  .object({
    from: z.string().email(),
    to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
    subject: z.string().min(1),
    text: z.string().optional(),
    html: z.string().optional(),
    cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
    bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
    reply_to: z
      .union([z.string().email(), z.array(z.string().email())])
      .optional(),
    headers: z.record(z.string()).optional(),
    tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  })
  .refine((data) => data.text || data.html, {
    message: "At least one of 'text' or 'html' must be provided",
  });
```

### Enforcement Fields

Email plugins extract different enforcement fields than LLM plugins:

```typescript
interface ResendEnforcementFields {
  fromDomain: string; // e.g., "myapp.com"
  toDomains: string[]; // Unique recipient domains
  recipientCount: number; // Total recipients (to + cc + bcc)
  hasHtml: boolean; // Whether HTML content is present
}
```

### Policy Constraints

Email-specific constraints that can be enforced:

| Constraint           | Type       | Description                         |
| -------------------- | ---------- | ----------------------------------- |
| `allowedFromDomains` | `string[]` | Restrict sender to specific domains |
| `allowedToDomains`   | `string[]` | Restrict recipients to domains      |
| `maxRecipients`      | `number`   | Max recipients per email            |
| `allowHtml`          | `boolean`  | Allow/disallow HTML content         |

### Usage Example

```typescript
import { resend } from "@glueco/plugin-mail-resend/client";
import { GatewayClient } from "@glueco/sdk";

const client = new GatewayClient({ ... });
const transport = await client.getTransport();
const mailClient = resend(transport);

const response = await mailClient.emails.send({
  from: "notifications@myapp.com",
  to: ["user1@example.com", "user2@example.com"],
  subject: "Important Update",
  html: "<h1>Update</h1><p>This is important.</p>",
  text: "Update\n\nThis is important.",
  tags: [{ name: "category", value: "updates" }],
});

console.log(`Email sent! ID: ${response.data.id}`);
```

---

## Build System

### Build Commands

| Command                    | Description                                |
| -------------------------- | ------------------------------------------ |
| `npm run build`            | Build all workspaces (runs prebuild first) |
| `npm run build:plugins`    | Build only plugins                         |
| `npm run build:proxy`      | Build proxy app                            |
| `npm run build:sdk`        | Build SDK package                          |
| `npm run build:shared`     | Build shared package                       |
| `npm run generate:plugins` | Regenerate enabled plugins file            |

### Build Order

Due to dependencies, build in this order:

1. `@glueco/shared` (no dependencies)
2. `@glueco/sdk` (depends on shared)
3. Plugins (depend on shared, optionally sdk)
4. Proxy app (depends on all)

### tsup Configuration

All packages use `tsup` for bundling:

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"], // Entry points
  format: ["cjs", "esm"], // Output formats
  dts: true, // Generate .d.ts
  clean: true, // Clean dist before build
  sourcemap: true, // Generate sourcemaps
  external: ["@glueco/sdk"], // Don't bundle these
});
```

---

## Naming Conventions

### Package Names

- Format: `@glueco/plugin-<resourceType>-<provider>`
- Examples:
  - `@glueco/plugin-llm-groq`
  - `@glueco/plugin-llm-gemini`
  - `@glueco/plugin-mail-resend`
  - `@glueco/plugin-storage-s3`

### Plugin IDs

- Format: `<resourceType>:<provider>`
- Examples:
  - `llm:groq`
  - `llm:gemini`
  - `mail:resend`
  - `storage:s3`

### Resource Types

Common resource types:

- `llm` - Large Language Models
- `mail` - Email services
- `storage` - File/object storage
- `database` - Database services
- `ai` - AI services (non-LLM)
- `payment` - Payment processing

### Action Names

- Use dot notation: `category.action`
- Examples:
  - `chat.completions`
  - `models.list`
  - `embeddings.create`
  - `mail.send`
  - `files.upload`

### File Structure

```
packages/plugin-xxx-yyy/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── README.md
└── src/
    ├── index.ts      # Main entrypoint (re-exports)
    ├── proxy.ts      # Server-side plugin implementation
    ├── client.ts     # Client-side typed wrapper
    └── contracts.ts  # Shared schemas and constants
```

---

## Summary

| Package                        | Purpose         | Import Path        |
| ------------------------------ | --------------- | ------------------ |
| `@glueco/shared`               | Types & schemas | `@glueco/shared`   |
| `@glueco/sdk`                  | Client SDK      | `@glueco/sdk`      |
| `@glueco/plugin-xxx/proxy`     | Server plugin   | Gateway proxy only |
| `@glueco/plugin-xxx/client`    | Typed client    | Target apps only   |
| `@glueco/plugin-xxx/contracts` | Shared types    | Both               |

**Key Principles:**

1. **Separation:** Proxy code never runs in target apps
2. **Type Safety:** Shared contracts ensure consistency
3. **Tree Shaking:** Only import what you need
4. **Extensibility:** Easy to add new resource types and providers
5. **Discovery:** Plugins auto-register via `proxy.plugins.ts`
