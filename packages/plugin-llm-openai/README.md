# @glueco/plugin-llm-openai

OpenAI LLM plugin for Personal Resource Gateway. Provides typed access to OpenAI's GPT models including GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo, and o1 reasoning models.

## Features

- **Full OpenAI API Support**: Chat completions with all parameters (tools, streaming, response formats, etc.)
- **Schema-First Validation**: Request validation using Zod schemas with enforcement field extraction
- **Typed Client**: Full TypeScript support with autocomplete for target apps
- **Dual-Entrypoint**: Clean separation between proxy and client code

## Installation

```bash
npm install @glueco/plugin-llm-openai
```

## Usage

### For Target Apps (Client-Side)

Use the typed client wrapper for full TypeScript support:

```typescript
import { openai } from "@glueco/plugin-llm-openai/client";
import { GatewayClient, FileKeyStorage, FileConfigStorage } from "@glueco/sdk";

// Setup gateway client
const gatewayClient = new GatewayClient({
  keyStorage: new FileKeyStorage("./.gateway/keys.json"),
  configStorage: new FileConfigStorage("./.gateway/config.json"),
});

// Get transport and create typed client
const transport = await gatewayClient.getTransport();
const openaiClient = openai(transport);

// Chat completion (non-streaming)
const response = await openaiClient.chatCompletions({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is the capital of France?" },
  ],
  temperature: 0.7,
  max_tokens: 1000,
});

console.log(response.data.choices[0].message.content);
```

### Streaming Chat Completion

```typescript
const stream = await openaiClient.chatCompletionsStream({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Tell me a story" }],
});

const reader = stream.stream.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Process SSE chunk
  console.log(chunk);
}
```

### Tool Calling

```typescript
const response = await openaiClient.chatCompletions({
  model: "gpt-4o",
  messages: [{ role: "user", content: "What's the weather in Paris?" }],
  tools: [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get current weather for a city",
        parameters: {
          type: "object",
          properties: {
            city: { type: "string" },
          },
          required: ["city"],
        },
      },
    },
  ],
});

const toolCall = response.data.choices[0].message.tool_calls?.[0];
if (toolCall) {
  console.log("Function called:", toolCall.function.name);
  console.log("Arguments:", JSON.parse(toolCall.function.arguments));
}
```

### With OpenAI SDK (Compatibility Mode)

You can also use the standard OpenAI SDK with the gateway's fetch wrapper:

```typescript
import OpenAI from "openai";
import { GatewayClient } from "@glueco/sdk";

const client = new GatewayClient({ ... });
const gatewayFetch = await client.getFetch();
const baseURL = await client.getResourceBaseUrl("llm", "openai");

const openai = new OpenAI({
  apiKey: "unused", // Gateway provides the key
  baseURL,
  fetch: gatewayFetch,
});

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});
```

## Supported Models

### GPT-4o Family

- `gpt-4o` - Latest GPT-4o
- `gpt-4o-2024-11-20`
- `gpt-4o-2024-08-06`
- `gpt-4o-mini` - Smaller, faster, cheaper

### GPT-4 Turbo

- `gpt-4-turbo` - Latest GPT-4 Turbo
- `gpt-4-turbo-2024-04-09`
- `gpt-4-turbo-preview`

### GPT-4

- `gpt-4`
- `gpt-4-0613`

### GPT-3.5 Turbo

- `gpt-3.5-turbo`
- `gpt-3.5-turbo-0125`

### o1 Reasoning Models

- `o1` - Latest o1
- `o1-preview`
- `o1-mini`

## Enforcement Fields

The plugin extracts these enforcement fields during validation:

| Field             | Type      | Description                                      |
| ----------------- | --------- | ------------------------------------------------ |
| `model`           | `string`  | The requested model name                         |
| `stream`          | `boolean` | Whether streaming is requested                   |
| `usesTools`       | `boolean` | Whether tools/functions are used                 |
| `maxOutputTokens` | `number?` | Max tokens (max_tokens or max_completion_tokens) |

These fields are used by the gateway's policy enforcement system to apply access controls.

## Plugin Configuration

When setting up credentials in the gateway admin:

| Field          | Type   | Required | Description                                   |
| -------------- | ------ | -------- | --------------------------------------------- |
| `apiKey`       | secret | Yes      | Your OpenAI API key (starts with sk-)         |
| `organization` | string | No       | Optional organization ID                      |
| `baseUrl`      | url    | No       | Custom base URL (for Azure OpenAI or proxies) |

## Actions

| Action             | Description                             |
| ------------------ | --------------------------------------- |
| `chat.completions` | Create chat completions with GPT models |

## License

MIT
