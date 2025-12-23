import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Conditionally import lovable-tagger only in development to avoid build issues
// Use a function to lazily load the plugin to prevent build failures
function getComponentTagger() {
  try {
    const { componentTagger } = require("lovable-tagger");
    return componentTagger;
  } catch (e) {
    // Silently fail if lovable-tagger is not available
    // This prevents build failures in production
    return null;
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [react()];
  
  // Only add componentTagger in development mode
  if (mode === 'development') {
    const tagger = getComponentTagger();
    if (tagger) {
      plugins.push(tagger());
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Prefer package version when available, otherwise a timestamp
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || new Date().toISOString()),
    },
    build: {
      rollupOptions: {
        output: {
          // Use [hash] for long-term caching rather than an ever-changing timestamp
          entryFileNames: `assets/[name].[hash].js`,
          chunkFileNames: `assets/[name].[hash].js`,
          assetFileNames: `assets/[name].[hash].[ext]`,
          // Optimize chunk splitting for better caching
          manualChunks: (id) => {
            // Split vendor chunks for better caching
            if (id.includes('node_modules')) {
              // Separate large libraries into their own chunks
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('@supabase')) {
                return 'supabase-vendor';
              }
              if (id.includes('lucide-react')) {
                return 'icons-vendor';
              }
              // All other node_modules go into vendor chunk
              return 'vendor';
            }
          },
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Disable sourcemaps in production for faster builds
      sourcemap: false,
    },
  };
});
