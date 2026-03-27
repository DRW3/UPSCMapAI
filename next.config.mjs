/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // maplibre-gl uses worker threads — treat as external on server
      config.resolve.alias = {
        ...config.resolve.alias,
        'maplibre-gl': 'maplibre-gl',
      }
    }
    return config
  },
  // Allow serving GeoJSON from public/
  async headers() {
    return [
      {
        source: '/geojson/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ]
  },
}

export default nextConfig
