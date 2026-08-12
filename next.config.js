/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  async rewrites() {
    return {
      fallback: [
        {
          source: '/:path*',
          destination: '/api/express/:path*'
        }
      ]
    };
  }
};

module.exports = nextConfig;
