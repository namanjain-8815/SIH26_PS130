/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    let backendUrl = process.env.BACKEND_URL || (process.env.VERCEL ? '' : 'http://localhost:4000');
    if (!backendUrl) {
      return [];
    }
    backendUrl = backendUrl.replace(/\/+$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
