/**
 * Preset test requests for the System Check app.
 * These cover common resource types and endpoints.
 */

export interface Preset {
  id: string;
  name: string;
  description: string;
  resourceType: string;
  provider: string;
  method: "GET" | "POST";
  path: string;
  body?: string;
  expectedStatus?: number[];
}

export const PRESETS: Preset[] = [
  // OpenAI-compatible LLM endpoints
  {
    id: "groq-chat",
    name: "Groq Chat Completions",
    description: "Send a simple chat completion request to Groq",
    resourceType: "llm",
    provider: "groq",
    method: "POST",
    path: "/v1/chat/completions",
    body: JSON.stringify(
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: "Say 'Hello from Proxy System Check!' in exactly 5 words.",
          },
        ],
        max_tokens: 50,
      },
      null,
      2,
    ),
    expectedStatus: [200],
  },
  // Gemini
  {
    id: "gemini-chat",
    name: "Gemini Chat Completions",
    description: "Send a simple chat completion request to Gemini",
    resourceType: "llm",
    provider: "gemini",
    method: "POST",
    path: "/v1/chat/completions",
    body: JSON.stringify(
      {
        model: "gemini-1.5-flash",
        messages: [
          {
            role: "user",
            content: "Say 'Hello from Proxy System Check!' in exactly 5 words.",
          },
        ],
        max_tokens: 50,
      },
      null,
      2,
    ),
    expectedStatus: [200],
  },
  // OpenAI
  {
    id: "openai-chat",
    name: "OpenAI Chat Completions",
    description: "Send a simple chat completion request to OpenAI",
    resourceType: "llm",
    provider: "openai",
    method: "POST",
    path: "/v1/chat/completions",
    body: JSON.stringify(
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "Say 'Hello from Proxy System Check!' in exactly 5 words.",
          },
        ],
        max_tokens: 50,
      },
      null,
      2,
    ),
    expectedStatus: [200],
  },
  // Anthropic
  {
    id: "anthropic-chat",
    name: "Anthropic Chat Completions",
    description:
      "Send a simple chat completion request to Anthropic (OpenAI-compatible)",
    resourceType: "llm",
    provider: "anthropic",
    method: "POST",
    path: "/v1/chat/completions",
    body: JSON.stringify(
      {
        model: "claude-3-haiku-20240307",
        messages: [
          {
            role: "user",
            content: "Say 'Hello from Proxy System Check!' in exactly 5 words.",
          },
        ],
        max_tokens: 50,
      },
      null,
      2,
    ),
    expectedStatus: [200],
  },
  // Resend Email
  {
    id: "resend-send",
    name: "Resend Send Email",
    description: "Send a test email via Resend",
    resourceType: "mail",
    provider: "resend",
    method: "POST",
    path: "/emails/send",
    body: JSON.stringify(
      {
        from: "test@example.com",
        to: "recipient@example.com",
        subject: "Test from Proxy System Check",
        html: "<h1>Hello!</h1><p>This is a test email sent via the Glueco Gateway.</p>",
      },
      null,
      2,
    ),
    expectedStatus: [200],
  },
];

/**
 * Common resource types for the dropdown
 */
export const RESOURCE_TYPES = ["llm", "mail", "storage", "search"];

/**
 * Common providers for each resource type
 */
export const PROVIDERS: Record<string, string[]> = {
  llm: ["groq", "gemini", "openai", "anthropic", "cohere", "mistral"],
  mail: ["sendgrid", "resend", "mailgun"],
  storage: ["s3", "gcs", "azure"],
  search: ["algolia", "elasticsearch", "typesense"],
};

/**
 * Get providers for a resource type
 */
export function getProvidersForType(resourceType: string): string[] {
  return PROVIDERS[resourceType] || [];
}
