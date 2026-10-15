import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/myttcoach/',
  plugins: [
    preact(),
    // Offline: everything the app needs is precached on first visit; updates install silently.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      manifest: {
        name: 'Third Ball — table tennis coach',
        short_name: 'Third Ball',
        description: 'Your personal table tennis coach. Plans, drills and moves, all on your device.',
        lang: 'en',
        start_url: '/myttcoach/#/today',
        scope: '/myttcoach/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fbf8f3',
        theme_color: '#1f4f6a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App code, styles, 3D chunk, animations and the two fonts the app uses (Latin).
        // Other font files (style board, extra scripts) are cached when first used.
        globPatterns: [
          '**/*.{js,css,html,svg}',
          'apple-touch-icon.png', // manifest icons are added by the plugin
          'assets/bricolage-grotesque-latin-standard-*.woff2',
          'assets/atkinson-hyperlegible-next-latin-wght-*.woff2',
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 30 } },
          },
        ],
      },
    }),
  ],
  build: { target: 'es2020', sourcemap: false },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
} as any);
