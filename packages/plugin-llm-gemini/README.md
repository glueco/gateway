# @glueco/plugin-llm-gemini

Google Gemini LLM plugin for Personal Resource Gateway.

## Installation

```bash
npm install @glueco/plugin-llm-gemini
```

## Usage

1. Install the package
2. Add to `proxy.plugins.ts` at repository root:

```typescript
const enabledPlugins = [
  "@glueco/plugin-llm-gemini",
  // ... other plugins
] as const;
```

3. Run `npm run build` or redeploy

## Features

- **OpenAI Compatibility**: Accepts OpenAI-compatible requests and translates them to Gemini API format
- **Response Translation**: Converts Gemini responses back to OpenAI format
- **Streaming Support**: Full streaming support with SSE translation

## Supported Actions

- `chat.completions` - OpenAI-compatible chat completions

## Supported Models

- gemini-2.0-flash-exp
- gemini-1.5-flash
- gemini-1.5-flash-8b
- gemini-1.5-pro

## Enforcement Support

This plugin supports the following enforcement knobs:

- `model` - Restrict to specific models
- `max_tokens` - Limit output tokens
- `streaming` - Enable/disable streaming

## Credentials

Required credentials in proxy admin:

- `apiKey` - Your Google AI Studio API key
- `baseUrl` (optional) - Custom API base URL
