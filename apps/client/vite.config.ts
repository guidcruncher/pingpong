import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite'
import {BootstrapVueNextResolver} from 'bootstrap-vue-next/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      dirs: ['src/components'],
      extensions: ['vue'],
      directoryAsNamespace: false,
      dts: true, 
      resolvers: [BootstrapVueNextResolver()],
    }),
  ],
  css: {
    // Transformer set to postcss to handle Bootstrap source without lightningcss errors
    transformer: 'postcss',
  },
  build: {
    outDir:"./dist",
    emptyOutDir: true,
    // Fixes the CSS syntax error by using esbuild instead of lightningcss
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        // Function-based manualChunks avoids property assignment errors in strict types
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue')) {
              return 'vendor-vue';
            }
            if (id.includes('lucide')) {
              return 'vendor-icons';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        // rewrite logic can be enabled if the backend expects paths without the /api prefix
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
