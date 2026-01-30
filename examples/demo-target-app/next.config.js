/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@glueco/sdk',
    '@glueco/shared',
    '@glueco/plugin-llm-gemini',
    '@glueco/plugin-llm-groq',
    '@glueco/plugin-llm-openai',
    '@glueco/plugin-mail-resend',
  ],
  webpack: (config, { isServer }) => {
    // Stub out fs/promises for browser bundles
    // The SDK imports FileKeyStorage which uses fs, but we use browser storage
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        'fs/promises': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
