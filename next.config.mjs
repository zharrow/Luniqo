/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serveur autonome (.next/standalone) : seules les dépendances réellement
  // utilisées sont copiées, pour une image Docker légère (docker/front).
  output: 'standalone',

  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // Redirects for deprecated routes
  async redirects() {
    return [
      {
        source: '/owner/haccp/children',
        destination: '/owner/children',
        permanent: true,
      },
    ]
  },

  // Skip failing pages during static export (pages with auth context)
  // These pages will be server-rendered at runtime instead
  staticPageGenerationTimeout: 120,

  // Generate build ID to enable incremental static regeneration
  generateBuildId: async () => {
    return 'luniqo-build-' + Date.now()
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'recharts'],
  },

  // Compress responses
  compress: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
