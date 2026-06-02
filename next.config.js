const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  outputFileTracingRoot: path.join(__dirname, '../'),
  images: {
    domains: ['avatars.githubusercontent.com', 'github.com'],
  },
};

module.exports = nextConfig;
