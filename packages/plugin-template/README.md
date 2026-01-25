# Plugin Template

Template plugin for Personal Resource Gateway. Copy this package to create new plugins.

## Creating a New Plugin

1. **Copy this directory:**

   ```bash
   cp -r packages/plugin-template packages/plugin-<resourceType>-<provider>
   ```

2. **Update `package.json`:**
   - Change `name` to `@glueco/plugin-<resourceType>-<provider>`
   - Update `description`
   - Add any additional dependencies

3. **Customize `src/index.ts`:**
   - Update configuration constants (API_BASE_URL, RESOURCE_TYPE, PROVIDER, etc.)
   - Implement `validateAndShape()` for input validation
   - Implement `execute()` for API calls
   - Implement `extractUsage()` for metrics
   - Implement `mapError()` for error handling

4. **Build:**

   ```bash
   npm run build
   ```

5. **Enable in proxy:**
   - Add to `proxy.plugins.ts` at repository root
   - Run `npm run build` to regenerate enabled plugins

## Plugin Contract

Every plugin must implement the `PluginContract` interface:

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

  // Optional
  readonly extractors?: Record<string, ExtractorDescriptor>;
  readonly credentialSchema?: PluginCredentialSchema;

  // Methods
  validateAndShape(action, input, constraints): PluginValidationResult;
  execute(action, shapedInput, ctx, options): Promise<PluginExecuteResult>;
  extractUsage(response): PluginUsageMetrics;
  mapError(error): PluginMappedError;
}
```

## Actions and Routes

Actions map to URL paths in the proxy:

| Action             | Route                                   |
| ------------------ | --------------------------------------- |
| `chat.completions` | `/r/<type>/<provider>/chat.completions` |
| `models.list`      | `/r/<type>/<provider>/models.list`      |
| `send`             | `/r/<type>/<provider>/send`             |

For OpenAI compatibility, paths like `/v1/chat/completions` are also supported.

## Enforcement Support

Declare which enforcement knobs your plugin supports:

```typescript
supports: {
  enforcement: ["model", "max_tokens", "streaming"];
}
```

The proxy will use these for policy enforcement.

## Credentials

Define a credential schema for the admin UI:

```typescript
credentialSchema: {
  fields: [
    {
      name: "apiKey",
      type: "secret",
      label: "API Key",
      description: "Your API key",
      required: true,
    },
  ],
}
```

## Testing

Before publishing, test your plugin locally:

1. Build the plugin
2. Add to proxy.plugins.ts
3. Run the proxy in development mode
4. Use the System Check app to test

## Publishing

To publish to npm:

```bash
cd packages/plugin-<resourceType>-<provider>
npm publish --access public
```
