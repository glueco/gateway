# 🔍 Proxy System Check

A diagnostic tool to test and verify your Personal Resource Gateway (PRG) deployment.

This app connects to your proxy using the standard pairing/approval flow, then lets you run test requests against all available resources with proper PoP (Proof of Possession) authentication.

## Features

- **Connect to any PRG proxy** via pairing string
- **Interactive request builder** with presets for common endpoints
- **Live request preview** showing exact URL, headers (including PoP), and body
- **Response viewer** with status, headers, and pretty-printed body
- **Copy as curl** for debugging
- **Temporary session storage** (30 min TTL, no permanent secrets)

## Quick Start

1. **Start the app:**

   ```bash
   # From the repository root
   pnpm install
   pnpm --filter @glueco/proxy-system-check dev
   ```

   The app will start at http://localhost:3001

2. **Get a pairing string from your proxy:**
   - Go to your proxy's admin dashboard
   - Navigate to Apps → Generate Pairing String
   - Copy the pairing string (looks like `pair::https://your-proxy.vercel.app::abc123...`)

3. **Connect:**
   - Paste the pairing string into the input
   - Click "Connect & Request Approval"
   - You'll be redirected to your proxy to approve the connection
   - After approval, you'll return to the System Check dashboard

4. **Run tests:**
   - Use the **Presets** tab for common tests (list models, chat completions)
   - Use the **Custom Request** tab to craft your own requests
   - View the request preview to see exact PoP headers
   - Click "Run Request" to execute

## How It Works

### Connection Flow

1. App parses the pairing string to get proxy URL and connect code
2. Generates a temporary Ed25519 keypair
3. Sends a connect request to the proxy's `/api/connect/prepare` endpoint
4. User is redirected to proxy to approve the app
5. After approval, the callback returns with an `app_id`
6. Credentials (keyPair, appId, proxyUrl) are stored in localStorage with 30-min TTL

### Request Signing (PoP v1)

Every request includes these headers:

| Header     | Description                               |
| ---------- | ----------------------------------------- |
| `x-pop-v`  | Protocol version ("1")                    |
| `x-app-id` | Your app's ID from approval               |
| `x-ts`     | Unix timestamp (seconds)                  |
| `x-nonce`  | Random 32-character hex string            |
| `x-sig`    | Ed25519 signature of the canonical string |

The signature covers: version, method, path+query, appId, timestamp, nonce, and body hash.

### Security Notes

- **No permanent storage:** Keys and app ID are stored in localStorage with a 30-minute TTL
- **Session auto-expires:** When TTL expires, credentials are cleared
- **Request-bound signatures:** Each signature is unique (timestamp + nonce) and expires quickly
- **Client-side only:** No server-side credential storage in this app

## Preset Tests

| Preset             | Endpoint                                    | Description                   |
| ------------------ | ------------------------------------------- | ----------------------------- |
| List Groq Models   | `GET /r/llm/groq/v1/models`                 | Fetch available Groq models   |
| Groq Chat          | `POST /r/llm/groq/v1/chat/completions`      | Simple chat completion        |
| List Gemini Models | `GET /r/llm/gemini/v1/models`               | Fetch available Gemini models |
| Gemini Chat        | `POST /r/llm/gemini/v1/chat/completions`    | Simple chat completion        |
| List OpenAI Models | `GET /r/llm/openai/v1/models`               | Fetch available OpenAI models |
| OpenAI Chat        | `POST /r/llm/openai/v1/chat/completions`    | Simple chat completion        |
| Anthropic Chat     | `POST /r/llm/anthropic/v1/chat/completions` | Simple chat completion        |

## Custom Requests

Build your own requests with:

- **Method:** GET or POST
- **Resource Type:** llm, mail, storage, search (or custom)
- **Provider:** groq, gemini, openai, etc.
- **Path:** API path like `/v1/chat/completions`
- **Query String:** Optional query parameters
- **Body:** JSON request body (for POST)

## Route Format

All proxied requests use the format:

```
/r/{resourceType}/{provider}/{...path}
```

Examples:

- `/r/llm/groq/v1/chat/completions`
- `/r/llm/gemini/v1/models`
- `/r/mail/sendgrid/v3/mail/send`

## Troubleshooting

### "Connection denied" error

- Make sure the pairing string is fresh (they expire)
- Check that the proxy owner approved your request

### "Signature verification failed" error

- Your session may have expired - reconnect
- Check that your system clock is accurate

### "Resource not found" (404)

- The resource (e.g., `llm:groq`) may not be configured on the proxy
- Check with the proxy admin which resources are available

### "Forbidden" (403)

- Your app may not have permission for the requested action
- The proxy's access policy may restrict this endpoint

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm --filter @glueco/proxy-system-check dev

# Build for production
pnpm --filter @glueco/proxy-system-check build
```

## License

Part of the Personal Resource Gateway project.
