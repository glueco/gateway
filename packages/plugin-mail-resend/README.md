# @glueco/plugin-mail-resend

Resend Email plugin for Personal Resource Gateway. Enables sending transactional emails through the [Resend](https://resend.com) API with schema-first validation and policy enforcement.

## Installation

```bash
npm install @glueco/plugin-mail-resend
```

## Features

- **Schema-First Validation**: All requests are validated using Zod schemas before processing
- **Policy Enforcement**: Support for domain restrictions, recipient limits, and content type policies
- **Type-Safe Client**: Full TypeScript support with typed request/response interfaces
- **PoP Authentication**: Proof of Possession authentication for secure API calls

## Supported Actions

| Action        | Description              |
| ------------- | ------------------------ |
| `emails.send` | Send transactional email |

## Enforcement Fields

The plugin extracts the following enforcement fields during validation:

| Field            | Type       | Description                            |
| ---------------- | ---------- | -------------------------------------- |
| `fromDomain`     | `string`   | Domain of the sender email address     |
| `toDomains`      | `string[]` | Unique domains of all recipients       |
| `recipientCount` | `number`   | Total number of recipients (to+cc+bcc) |
| `hasHtml`        | `boolean`  | Whether HTML content is present        |

## Supported Constraints

| Constraint           | Type       | Description                                 |
| -------------------- | ---------- | ------------------------------------------- |
| `allowedFromDomains` | `string[]` | Restrict sender to specific domains         |
| `allowedToDomains`   | `string[]` | Restrict recipients to specific domains     |
| `maxRecipients`      | `number`   | Maximum number of recipients per email      |
| `allowHtml`          | `boolean`  | Allow/disallow HTML content (default: true) |
| `allowAttachments`   | `boolean`  | Allow/disallow attachments (default: true)  |

## Usage

### Gateway Configuration

1. Add to `proxy.plugins.ts`:

```typescript
const enabledPlugins = [
  "@glueco/plugin-mail-resend",
  // ... other plugins
];
```

2. Set environment variable:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

3. Register the resource in the admin UI with your Resend API key.

### Client Usage (Target Apps)

```typescript
import { resend } from "@glueco/plugin-mail-resend/client";
import { GatewayClient } from "@glueco/sdk";

// Setup gateway client
const gatewayClient = new GatewayClient({
  keyStorage: new FileKeyStorage("./.gateway/keys.json"),
  configStorage: new FileConfigStorage("./.gateway/config.json"),
});

// Get transport and create typed client
const transport = await gatewayClient.getTransport();
const mailClient = resend(transport);

// Send an email
const response = await mailClient.emails.send({
  from: "notifications@myapp.com",
  to: "user@example.com",
  subject: "Welcome!",
  html: "<h1>Welcome to our app!</h1>",
  text: "Welcome to our app!", // Fallback plain text
});

console.log(`Email sent! ID: ${response.data.id}`);
```

### Request Schema

```typescript
interface SendEmailRequest {
  // Required
  from: string; // Sender email address
  to: string | string[]; // Recipient(s)
  subject: string; // Email subject (non-empty)

  // Content (at least one required)
  text?: string; // Plain text body
  html?: string; // HTML body

  // Optional recipients
  cc?: string | string[]; // CC recipients
  bcc?: string | string[]; // BCC recipients

  // Optional metadata
  reply_to?: string | string[]; // Reply-to address(es)
  headers?: Record<string, string>; // Custom headers
  tags?: Array<{
    // Tracking tags
    name: string;
    value: string;
  }>;

  // Optional scheduling
  scheduled_at?: string; // ISO 8601 datetime

  // Optional attachments
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    contentType?: string;
  }>;
}
```

### Response Schema

```typescript
interface SendEmailResponse {
  id: string; // Resend email ID
}
```

## Examples

### Basic Text Email

```typescript
await mailClient.emails.send({
  from: "hello@example.com",
  to: "user@example.com",
  subject: "Hello!",
  text: "This is a plain text email.",
});
```

### HTML Email with Multiple Recipients

```typescript
await mailClient.emails.send({
  from: "team@example.com",
  to: ["user1@example.com", "user2@example.com"],
  cc: "manager@example.com",
  subject: "Team Update",
  html: `
    <h1>Weekly Update</h1>
    <p>Here's what happened this week...</p>
  `,
  text: "Weekly Update\n\nHere's what happened this week...",
  tags: [
    { name: "category", value: "updates" },
    { name: "team", value: "engineering" },
  ],
});
```

### Scheduled Email

```typescript
await mailClient.emails.send({
  from: "reminders@example.com",
  to: "user@example.com",
  subject: "Reminder: Meeting Tomorrow",
  text: "Don't forget about the meeting tomorrow at 10am.",
  scheduled_at: "2024-01-15T09:00:00Z",
});
```

## Error Handling

The plugin maps Resend API errors to standard gateway error codes:

| HTTP Status | Error Code         | Retryable |
| ----------- | ------------------ | --------- |
| 400         | `BAD_REQUEST`      | No        |
| 401         | `UNAUTHORIZED`     | No        |
| 403         | `FORBIDDEN`        | No        |
| 422         | `VALIDATION_ERROR` | No        |
| 429         | `RATE_LIMITED`     | Yes       |
| 500-503     | `PROVIDER_ERROR`   | Yes       |

## Development

```bash
# Build the plugin
npm run build

# Watch mode
npm run dev

# Type checking
npm run typecheck
```

## License

MIT
