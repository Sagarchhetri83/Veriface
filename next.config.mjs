/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/veriface' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/veriface/' : '',
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    config.resolve.fallback = { fs: false, encoding: false };
    return config;
  },
}

export default nextConfig;