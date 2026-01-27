# Plugin Template

Template plugin demonstrating the **dual-entrypoint architecture** for Personal Resource Gateway.

## Architecture Overview

This plugin demonstrates the SDK-compatible dual-entrypoint pattern:

```
@glueco/plugin-template/
├── proxy     → Server-side plugin for the gateway
├── client    → Client-side typed wrappers for target apps
└── contracts → Shared Zod schemas and types
```

### Why Dual Entrypoints?

1. **Separation of Concerns**: Proxy runtime and target SDK code are cleanly separated
2. **Type Safety**: Target apps get typed autocomplete without installing vendor SDKs
3. **Tree-Shaking**: Client code doesn't bundle proxy code and vice versa
4. **No Heavy SDKs**: Proxy plugins remain thin HTTP adapters

## Usage

### For Proxy (Server-Side)

The proxy imports the `/proxy` entrypoint to handle requests:

```typescript
// In proxy enabled.generated.ts
import templatePlugin from "@glueco/plugin-template/proxy";

export const ENABLED_PLUGINS = [templatePlugin];
```

### For Target Apps (Client-Side)

Target apps import the `/client` entrypoint for typed methods:

```typescript
import { template } from "@glueco/plugin-template/client";
import { GatewayClient, FileKeyStorage, FileConfigStorage } from "@glueco/sdk";

// Setup gateway client
const gatewayClient = new GatewayClient({
  keyStorage: new FileKeyStorage("./.gateway/keys.json"),
  configStorage: new FileConfigStorage("./.gateway/config.json"),
});

// Get transport and create typed client
const transport = await gatewayClient.getTransport();
const templateClient = template(transport);

// Use with full type safety and autocomplete!
const response = await templateClient.actionOne({
  input: "hello world",
  config: { option1: true },
});

console.log(response.data.result); // TypeScript knows this is ActionOneResponse
```

## Creating a New Plugin

1. **Copy this directory:**

   ```bash
   cp -r packages/plugin-template packages/plugin-<resourceType>-<provider>
   ```

2. **Update `package.json`:**
   - Change `name` to `@glueco/plugin-<resourceType>-<provider>`
   - Update `description`
   - Add any additional dependencies

3. **Define contracts in `src/contracts.ts`:**
   - Create Zod schemas for request/response types
   - Export constants: PLUGIN_ID, RESOURCE_TYPE, PROVIDER, VERSION, ACTIONS
   - These are shared between proxy and client

4. **Implement proxy in `src/proxy.ts`:**
   - Import schemas from contracts
   - Implement `validateAndShape()` for input validation
   - Implement `execute()` for API calls
   - Implement `extractUsage()` for metrics
   - Implement `mapError()` for error handling
   - Add `client` metadata for SDK compatibility

5. **Implement client in `src/client.ts`:**
   - Import types from contracts
   - Create factory function that takes GatewayTransport
   - Return object with typed methods per action
   - Use `transport.request<ResponseType, RequestType>()` for type safety

6. **Build:**

   ```bash
   npm run build
   ```

7. **Enable in proxy:**
   - Add to `proxy.plugins.ts` at repository root
   - Run `npm run build` to regenerate enabled plugins

## File Structure

```
src/
├── index.ts      # Re-exports for backward compatibility
├── contracts.ts  # Shared Zod schemas and constants
├── proxy.ts      # Server-side plugin implementation
└── client.ts     # Client-side typed wrappers
```

## SDK-Compatible Plugin Rules

A plugin is considered "SDK-compatible" only if it:

1. ✅ Exports both `/proxy` and `/client` entrypoints
2. ✅ Includes shared contracts (Zod schemas)
3. ✅ Has `client` metadata in the plugin definition
4. ✅ Client entrypoint does NOT import proxy code
5. ✅ Proxy entrypoint does NOT import client code

## Plugin Contract

Every proxy plugin must implement the `PluginContract` interface:

```typescript
interface PluginContract {
  // Identification
  readonly id: string; // "resourceType:provider"
  readonly resourceType: string; // "llm", "mail", "storage"
  readonly provider: string; // "groq", "resend", "s3"
  readonly version: string; // "1.0.0"
  readonly name: string; // "Groq LLM"

  // Capabilities
  readonly actions: string[]; // ["chat.completions", "models.list"]
  readonly auth: PluginAuth;
  readonly supports: PluginSupports;

  // SDK-compatible plugins include client metadata
  readonly client?: {
    namespace: string; // "groq"
    actions: Record<string, { description?: string }>;
  };

  // Methods - Schema-First Pipeline
  validateAndShape(action, input, constraints): PluginValidationResult;
  // Returns: { valid, shapedInput?, enforcement?, error? }

  execute(action, shapedInput, ctx, options): Promise<PluginExecuteResult>;
  extractUsage(response): PluginUsageMetrics;
  mapError(error): PluginMappedError;
}

/**
 * Enforcement fields extracted during validation.
 * Used by gateway for policy checking.
 */
interface EnforcementFields {
  model?: string; // Model identifier
  stream?: boolean; // Streaming requested?
  usesTools?: boolean; // Tools/functions used?
  maxOutputTokens?: number; // Max output tokens
}

interface PluginValidationResult {
  valid: boolean;
  shapedInput?: unknown; // Validated/transformed request
  enforcement?: EnforcementFields; // For policy enforcement
  error?: string;
}
```

## Schema-First Enforcement

The gateway uses schema-first validation where enforcement fields are extracted **during** validation:

```typescript
validateAndShape(action, input, constraints): PluginValidationResult {
  // 1. Parse with Zod schema
  const parsed = ChatCompletionRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { valid: false, error: parsed.error.message };
  }

  // 2. Extract enforcement fields DURING validation
  const enforcement: EnforcementFields = {
    model: parsed.data.model,
    stream: parsed.data.stream ?? false,
    usesTools: Array.isArray(parsed.data.tools) && parsed.data.tools.length > 0,
    maxOutputTokens: parsed.data.max_tokens,
  };

  // 3. Apply any constraints
  // ...

  // 4. Return with enforcement fields
  return { valid: true, shapedInput: parsed.data, enforcement };
}
```

**Key Principle: Fail-Closed**

If the access policy has a constraint (e.g., `allowedModels`) but the plugin doesn't return the corresponding enforcement field (`model`), the request is **rejected**. This ensures security defaults are strict.

```
Constraint exists + Enforcement field missing = REJECT
Constraint exists + Enforcement field present = CHECK
No constraint = ALLOW
```

## Versioning

- Plugin package version is the contract version
- Proxy discovery exposes plugin version for client compatibility checks
- TODO: Add strict version enforcement in future iteration

## Best Practices

1. **Keep contracts minimal**: Only include what's needed for validation
2. **Use Zod for schemas**: Provides both validation and type inference
3. **No vendor SDKs in target apps**: The whole point is typed access without heavy dependencies
4. **Thin proxy adapters**: Just HTTP translation, no business logic
5. **Export types generously**: Help target app developers with autocomplete
