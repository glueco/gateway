# @glueco/plugin-llm-groq

Groq LLM plugin for Personal Resource Gateway.

## Installation

```bash
npm install @glueco/plugin-llm-groq
```

## Usage

1. Install the package
2. Add to `proxy.plugins.ts` at repository root:

```typescript
const enabledPlugins = [
  "@glueco/plugin-llm-groq",
  // ... other plugins
] as const;
```

3. Run `npm run build` or redeploy

## Supported Actions

- `chat.completions` - OpenAI-compatible chat completions

## Supported Models

- llama-3.3-70b-versatile
- llama-3.1-70b-versatile
- llama-3.1-8b-instant
- llama3-70b-8192
- llama3-8b-8192
- mixtral-8x7b-32768
- gemma2-9b-it

## Enforcement Support

This plugin supports the following enforcement knobs:

- `model` - Restrict to specific models
- `max_tokens` - Limit output tokens
- `streaming` - Enable/disable streaming

## Credentials

Required credentials in proxy admin:

- `apiKey` - Your Groq API key
- `baseUrl` (optional) - Custom API base URL
