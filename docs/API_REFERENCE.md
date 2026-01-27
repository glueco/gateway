# API Reference

This document describes all API endpoints exposed by the Personal Resource Gateway.

---

## Base URL

All API endpoints are relative to your gateway's base URL:

```
https://your-gateway.example.com
```

---

## Authentication

### Admin Endpoints

Admin endpoints require session-based authentication via the `ADMIN_SECRET`.

### Resource Endpoints

Resource endpoints require PoP (Proof-of-Possession) authentication:

| Header | Description |
|--------|-------------|
| `x-app-id` | Your App ID (received after approval) |
| `x-ts` | Unix timestamp in seconds |
| `x-nonce` | Random 16-byte nonce (base64url encoded) |
| `x-sig` | Ed25519 signature of canonical payload (base64url) |

The SDK handles this automatically.

---

## Public Endpoints

### Discovery

#### GET /api/resources

Returns available resources on this gateway.

**Response:**

```json
{
  "gateway": {
    "version": "1.0.0",
    "name": "Personal Resource Gateway"
  },
  "resources": [
    {
      "resourceId": "llm:groq",
      "actions": ["chat.completions"],
      "auth": { "pop": { "version": 1 } },
      "constraints": { "supports": ["model", "max_tokens", "streaming"] }
    },
    {
      "resourceId": "llm:openai",
      "actions": ["chat.completions"],
      "auth": { "pop": { "version": 1 } },
      "constraints": { "supports": ["model", "max_tokens", "streaming"] }
    },
    {
      "resourceId": "mail:resend",
      "actions": ["emails.send"],
      "auth": { "pop": { "version": 1 } },
      "constraints": { "supports": ["from", "to", "subject"] }
    }
  ]
}
```

---

## Connection Endpoints

### POST /api/connect/prepare

Prepares a connection request. Called by the SDK when connecting.

**Request Body:**

```json
{
  "pairingToken": "string",
  "app": {
    "name": "My App",
    "description": "An AI-powered application",
    "homepage": "https://myapp.com"
  },
  "publicKey": "base64url-encoded-ed25519-public-key",
  "permissions": [
    {
      "resourceId": "llm:groq",
      "actions": ["chat.completions"]
    }
  ],
  "duration": {
    "type": "preset",
    "preset": "1_hour"
  }
}
```

**Response (Success):**

```json
{
  "sessionToken": "sess_xxxxxxxxxxxx",
  "approvalUrl": "https://gateway.example.com/connect/approve?session=sess_xxx"
}
```

**Response (Error):**

```json
{
  "error": "Invalid or expired pairing token",
  "code": "INVALID_PAIRING_TOKEN"
}
```

### GET /api/connect/status

Polls connection status. Called by SDK while waiting for approval.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `session` | string | Session token from prepare |

**Response (Pending):**

```json
{
  "status": "pending"
}
```

**Response (Approved):**

```json
{
  "status": "approved",
  "appId": "app_xxxxxxxxxxxx",
  "gatewayUrl": "https://gateway.example.com",
  "expiresAt": "2024-01-15T12:00:00Z"
}
```

**Response (Rejected):**

```json
{
  "status": "rejected",
  "reason": "User denied the request"
}
```

---

## Resource Proxy Endpoints

All resource endpoints follow this pattern:

```
/r/<resourceType>/<provider>/<api-path>
```

### LLM - Chat Completions

#### POST /r/llm/{provider}/v1/chat/completions

Proxies to the LLM provider's chat completions API.

**Providers:** `groq`, `openai`, `gemini`

**Request Body:**

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "max_tokens": 1000,
  "temperature": 0.7,
  "stream": false
}
```

**Response:**

```json
{
  "id": "chatcmpl-xxxx",
  "object": "chat.completion",
  "created": 1704067200,
  "model": "llama-3.3-70b-versatile",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 15,
    "total_tokens": 35
  }
}
```

**Streaming:**

Set `stream: true` to receive Server-Sent Events:

```
data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"Hello"}}]}
data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"!"}}]}
data: [DONE]
```

### Email - Send

#### POST /r/mail/resend/emails/send

Sends an email via Resend.

**Request Body:**

```json
{
  "from": "notifications@yourdomain.com",
  "to": "recipient@example.com",
  "subject": "Hello from Gateway",
  "html": "<h1>Hello World</h1>",
  "text": "Hello World (plain text fallback)",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "reply_to": "reply@example.com",
  "tags": [
    { "name": "category", "value": "notification" }
  ]
}
```

**Response:**

```json
{
  "id": "email_xxxxxxxxxxxx"
}
```

---

## Admin Endpoints

All admin endpoints require authentication via `ADMIN_SECRET`.

### Authentication

#### POST /api/admin/login

Authenticates admin session.

**Request Body:**

```json
{
  "secret": "your-admin-secret"
}
```

**Response (Success):**

```json
{
  "authenticated": true
}
```

Sets HTTP-only cookie for session.

#### GET /api/admin/login

Checks authentication status.

**Response:**

```json
{
  "authenticated": true
}
```

#### DELETE /api/admin/login

Logs out admin session.

**Response:**

```json
{
  "loggedOut": true
}
```

### Apps Management

#### GET /api/admin/apps

Lists all connected apps.

**Response:**

```json
{
  "apps": [
    {
      "id": "app_xxxxxxxxxxxx",
      "name": "My App",
      "description": "An AI application",
      "homepage": "https://myapp.com",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00Z",
      "permissions": [
        {
          "id": "perm_xxxx",
          "resourceId": "llm:groq",
          "action": "chat.completions",
          "constraints": { "allowedModels": ["llama-3.3-70b-versatile"] },
          "expiresAt": "2024-01-15T00:00:00Z",
          "rateLimitRequests": 100,
          "rateLimitWindowSecs": 3600,
          "dailyQuota": 1000,
          "monthlyQuota": null,
          "status": "ACTIVE"
        }
      ],
      "dailyUsage": 42,
      "usageSummary": {
        "totalRequests": 150,
        "totalTokens": 45000,
        "modelBreakdown": [
          {
            "model": "llama-3.3-70b-versatile",
            "requestCount": 150,
            "totalTokens": 45000,
            "inputTokens": 15000,
            "outputTokens": 30000
          }
        ]
      }
    }
  ]
}
```

#### PATCH /api/admin/apps

Updates app status.

**Request Body:**

```json
{
  "appId": "app_xxxxxxxxxxxx",
  "status": "SUSPENDED"
}
```

**Status Options:** `ACTIVE`, `SUSPENDED`, `REVOKED`

#### PUT /api/admin/apps

Updates app details and permissions.

**Request Body:**

```json
{
  "appId": "app_xxxxxxxxxxxx",
  "name": "Updated Name",
  "description": "Updated description",
  "permissions": [
    {
      "id": "perm_xxxx",
      "expiresAt": "2024-02-01T00:00:00Z",
      "rateLimitRequests": 200,
      "rateLimitWindowSecs": 3600,
      "dailyQuota": 2000
    }
  ]
}
```

#### DELETE /api/admin/apps

Deletes an app and all its permissions.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `appId` | string | App ID to delete |

### Resources Management

#### GET /api/admin/resources

Lists configured resources.

**Response:**

```json
{
  "resources": [
    {
      "id": "res_xxxxxxxxxxxx",
      "resourceId": "llm:groq",
      "name": "Groq LLM",
      "resourceType": "llm",
      "status": "ACTIVE"
    }
  ]
}
```

#### POST /api/admin/resources

Adds a new resource with API key.

**Request Body:**

```json
{
  "resourceId": "llm:openai",
  "name": "OpenAI GPT",
  "resourceType": "llm",
  "secret": "sk-xxxxxxxxxxxxxxx"
}
```

**Response:**

```json
{
  "id": "res_xxxxxxxxxxxx",
  "resourceId": "llm:openai",
  "name": "OpenAI GPT",
  "status": "ACTIVE"
}
```

#### DELETE /api/admin/resources

Deletes a resource.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `resourceId` | string | Resource ID (e.g., `llm:openai`) |

### Pairing

#### POST /api/admin/pairing/generate

Generates a new pairing string.

**Response:**

```json
{
  "pairingString": "prg_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "expiresAt": "2024-01-01T00:10:00Z"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "additional context"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Resource or endpoint not found |
| `VALIDATION_ERROR` | 422 | Request body validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `EXPIRED` | 403 | Permission has expired |
| `MODEL_NOT_ALLOWED` | 403 | Model not in allowed list |
| `QUOTA_EXCEEDED` | 403 | Daily/monthly quota exceeded |
| `TOKEN_BUDGET_EXCEEDED` | 403 | Token limit exceeded |

---

## Rate Limiting

When rate limited, responses include:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests per window |
| `X-RateLimit-Remaining` | Remaining requests |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |
| `Retry-After` | Seconds to wait before retrying |

---

## Versioning

The API is currently at version 1.0. Breaking changes will be communicated in advance.

Gateway version is returned in discovery response:

```json
{
  "gateway": {
    "version": "1.0.0"
  }
}
```
