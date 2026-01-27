/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@glueco/shared",
    // Plugin packages (workspace packages need transpilation)
    "@glueco/plugin-llm-groq",
    "@glueco/plugin-llm-gemini",
    "@glueco/plugin-llm-openai",
    "@glueco/plugin-mail-resend",
    "@glueco/plugin-template",
  ],
  experimental: {
    serverComponentsExternalPackages: ["@noble/ed25519", "@noble/hashes"],
  },
  async headers() {
    return [
      {
        // New resource router paths
        source: "/r/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, x-app-id, x-ts, x-nonce, x-sig, x-gateway-resource",
          },
        ],
      },
      {
        // Legacy v1 path (deprecated)
        source: "/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, x-app-id, x-ts, x-nonce, x-sig, x-gateway-resource",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, x-app-id, x-ts, x-nonce, x-sig",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
