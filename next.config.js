const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  images: {
    domains: ['avatars.githubusercontent.com', 'github.com'],
  },
};

module.exports = nextConfig;
