# Adding Resource Plugins

This guide explains how to enable additional resource plugins in your Personal Resource Gateway deployment.

---

## Overview

The gateway uses a plugin system to support different API providers. Plugins are pre-built packages that handle the communication with specific services like OpenAI, Groq, Gemini, and Resend.

**Available Plugins:**

| Plugin Package               | Resource ID   | Provider                |
| ---------------------------- | ------------- | ----------------------- |
| `@glueco/plugin-llm-groq`    | `llm:groq`    | Groq (Llama, Mixtral)   |
| `@glueco/plugin-llm-openai`  | `llm:openai`  | OpenAI (GPT-4, GPT-3.5) |
| `@glueco/plugin-llm-gemini`  | `llm:gemini`  | Google Gemini           |
| `@glueco/plugin-mail-resend` | `mail:resend` | Resend (Email)          |

---

## How to Enable a Plugin

### Step 1: Install the Plugin Package

Add the plugin to your proxy's dependencies in [apps/proxy/package.json](../apps/proxy/package.json):

| For Plugin | Add to `dependencies`               |
| ---------- | ----------------------------------- |
| Groq       | `"@glueco/plugin-llm-groq": "*"`    |
| OpenAI     | `"@glueco/plugin-llm-openai": "*"`  |
| Gemini     | `"@glueco/plugin-llm-gemini": "*"`  |
| Resend     | `"@glueco/plugin-mail-resend": "*"` |

Then run `npm install` from the root directory.

### Step 2: Add to Plugin Configuration

Open [proxy.plugins.ts](../proxy.plugins.ts) in the root directory and add the plugin package name to the `enabledPlugins` array. For example, to add OpenAI, add `"@glueco/plugin-llm-openai"` to the array.

### Step 3: Redeploy

After making changes:

1. **Local development:** Restart the dev server with `npm run dev`
2. **Vercel deployment:** Push changes to trigger automatic redeployment

---

## Example: Enabling All LLM Plugins

To enable all available LLM providers, add all three plugin packages to your [apps/proxy/package.json](../apps/proxy/package.json) dependencies and list them in [proxy.plugins.ts](../proxy.plugins.ts).

---

## Example: Adding Email Support

To enable email sending via Resend, add `@glueco/plugin-mail-resend` to your dependencies and the `enabledPlugins` array.

---

## Verifying Plugins are Enabled

After deployment, check which plugins are active:

1. **Via API:** Call `GET /api/resources` to see available resources
2. **Via Dashboard:** Log in and go to the **Resources** tab

The resources listed will match the plugins you enabled.

---

## Adding API Keys for Plugins

After enabling a plugin, you need to add API keys in the admin dashboard:

1. Log into your gateway admin dashboard
2. Go to the **Resources** tab
3. Click **Add Resource**
4. Select the resource type (e.g., `llm:openai`)
5. Enter your API key for that provider
6. Click **Save**

Each plugin requires its own API key from the respective provider.

---

## Removing a Plugin

To disable a plugin:

1. Remove it from `enabledPlugins` in [proxy.plugins.ts](../proxy.plugins.ts)
2. Optionally remove it from [apps/proxy/package.json](../apps/proxy/package.json) dependencies
3. Redeploy

**Note:** Removing a plugin will cause requests to that resource to fail. Make sure no connected apps depend on it first.

---

## Plugin URLs After Enabling

Once enabled, plugins are available at these endpoints:

| Plugin | Endpoint                            |
| ------ | ----------------------------------- |
| Groq   | `/r/llm/groq/v1/chat/completions`   |
| OpenAI | `/r/llm/openai/v1/chat/completions` |
| Gemini | `/r/llm/gemini/v1/chat/completions` |
| Resend | `/r/mail/resend/emails/send`        |

---

## Troubleshooting

### Plugin not appearing in /api/resources

- Check that the plugin is listed in both `package.json` dependencies AND `proxy.plugins.ts`
- Run `npm install` after adding to `package.json`
- Restart the dev server or redeploy

### "Resource not supported" error

- Verify the plugin is enabled in `proxy.plugins.ts`
- Check for typos in the plugin package name
- Ensure you've redeployed after making changes

### Missing API key error

- Add the API key for the plugin in the admin dashboard under **Resources**

---

## Building Custom Plugins

If you want to create your own plugin for a new provider, see the [Package Architecture Guide](./PACKAGE_ARCHITECTURE.md) for detailed instructions on plugin development.
