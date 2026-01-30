# Adding New Integrations

This guide explains how to add support for a new resource plugin in the demo app.

## Prerequisites

- A published `@glueco/plugin-*` package
- The plugin exports `/client` and `/contracts` subpaths

## Steps

### 1. Install the Package

```bash
npm install @glueco/plugin-{type}-{provider}
```

### 2. Update Next.js Config

Add the package to `transpilePackages` in `next.config.js`:

```javascript
transpilePackages: [
  '@glueco/sdk',
  '@glueco/shared',
  '@glueco/plugin-{type}-{provider}', // Add new package
  // ...
],
```

### 3. Create Integration File

Create `src/integrations/{type}/{provider}.ts`:

```typescript
import { {provider} } from '@glueco/plugin-{type}-{provider}/client';
import type { GatewayTransport } from '@glueco/sdk';

// Re-export types
export type { 
  SomeRequest, 
  SomeResponse,
  {Provider}Client 
} from '@glueco/plugin-{type}-{provider}/client';

export { PLUGIN_ID } from '@glueco/plugin-{type}-{provider}/contracts';

export function create{Provider}Client(transport: GatewayTransport) {
  return {provider}(transport);
}

export default create{Provider}Client;
```

### 4. Update Barrel Export

Add to `src/integrations/{type}/index.ts`:

```typescript
export {
  create{Provider}Client,
  PLUGIN_ID as {PROVIDER}_PLUGIN_ID,
} from './{provider}';
export type { SomeRequest, SomeResponse, {Provider}Client } from './{provider}';
```

### 5. Add Preset (Optional)

Add a test preset in `src/lib/presets.ts`:

```typescript
import type { SomeRequest } from '@glueco/plugin-{type}-{provider}/contracts';

export function build{Provider}Request(): SomeRequest {
  return {
    // ... typed request
  };
}

// Add to PRESETS array
{
  id: '{provider}-action',
  name: '{Provider} Action',
  description: 'Test action for {Provider}',
  resourceType: '{type}',
  provider: '{provider}',
  method: 'POST',
  path: '/v1/some/action',
  body: JSON.stringify(build{Provider}Request(), null, 2),
  expectedStatus: [200],
},
```

### 6. Add Client in Dashboard

In `src/app/dashboard/page.tsx`, add the client:

```typescript
import { create{Provider}Client, type {Provider}Client } from '@/integrations/{type}';

// In TypedClients interface
interface TypedClients {
  // ...
  {provider}: {Provider}Client | null;
}

// In initialization
setClients({
  // ...
  {provider}: create{Provider}Client(gatewayTransport),
});

// In executePreset
else if (preset.resourceType === '{type}' && preset.provider === '{provider}' && clients.{provider}) {
  const body = JSON.parse(preset.body || '{}');
  result = await clients.{provider}.someMethod(body);
}
```

## File Structure

After adding a new integration:

```
src/integrations/
├── index.ts              # Root barrel
├── llm/
│   ├── index.ts
│   ├── gemini.ts
│   ├── groq.ts
│   ├── openai.ts
│   └── {newProvider}.ts  # New!
└── mail/
    ├── index.ts
    └── resend.ts
```

## Testing

1. Run `npm run build` to verify TypeScript compilation
2. Start the dev server with `npm run dev`
3. Connect to a gateway with the new resource configured
4. Test the preset in the dashboard
