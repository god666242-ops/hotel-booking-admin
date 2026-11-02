/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure remote image domains so hotel room photos from CDNs/Unsplash load properly
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Optional: rewrites for clean local proxying if you want to avoid direct CORS during local dev
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1') + '/admin'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;