/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    ETHEREUM_FACTORY_ADDRESS: process.env.ETHEREUM_FACTORY_ADDRESS,
    NEAR_FACTORY_CONTRACT: process.env.NEAR_FACTORY_CONTRACT,
    ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL,
    NEAR_NODE_URL: process.env.NEAR_NODE_URL,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
}

module.exports = nextConfig