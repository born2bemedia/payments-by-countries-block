/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude undici from server-side bundle
      config.externals = config.externals || [];
      config.externals.push('undici');
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['undici']
  }
}

module.exports = nextConfig 