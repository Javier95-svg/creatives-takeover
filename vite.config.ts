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
          // Manual chunk splitting for better caching and parallel loading
          manualChunks: (id) => {
            // React vendor chunk
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
              return 'react-vendor';
            }
            // Radix UI vendor chunk
            if (id.includes('node_modules/@radix-ui')) {
              return 'radix-vendor';
            }
            // Supabase and query client vendor chunk
            if (id.includes('node_modules/@supabase') || id.includes('node_modules/@tanstack/react-query')) {
              return 'supabase-vendor';
            }
            // Heavy libraries vendor chunk (fabric, mapbox, pdf generators, charts)
            if (
              id.includes('node_modules/fabric') ||
              id.includes('node_modules/mapbox-gl') ||
              id.includes('node_modules/jspdf') ||
              id.includes('node_modules/html2canvas') ||
              id.includes('node_modules/docx') ||
              id.includes('node_modules/recharts')
            ) {
              return 'heavy-vendor';
            }
            // UI/utility vendor chunk (tailwind, lucide, date-fns, etc.)
            if (
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/date-fns') ||
              id.includes('node_modules/tailwind') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge') ||
              id.includes('node_modules/class-variance-authority') ||
              id.includes('node_modules/next-themes') ||
              id.includes('node_modules/zustand') ||
              id.includes('node_modules/canvas-confetti') ||
              id.includes('node_modules/sonner') ||
              id.includes('node_modules/vaul') ||
              id.includes('node_modules/cmdk') ||
              id.includes('node_modules/embla-carousel-react')
            ) {
              return 'ui-vendor';
            }
            // Form and validation vendor chunk
            if (
              id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform/resolvers') ||
              id.includes('node_modules/zod') ||
              id.includes('node_modules/input-otp')
            ) {
              return 'form-vendor';
            }
            // Markdown and content vendor chunk
            if (
              id.includes('node_modules/react-markdown') ||
              id.includes('node_modules/remark') ||
              id.includes('node_modules/dompurify') ||
              id.includes('node_modules/react-helmet-async')
            ) {
              return 'content-vendor';
            }
            // Other vendor dependencies
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
      // Lower chunk size warning limit to catch large chunks
      chunkSizeWarningLimit: 500,
      // Add sourcemap for debugging (can be disabled in production)
      sourcemap: false,
      // Enable minification
      minify: 'esbuild',
      // Optimize chunk loading
      cssCodeSplit: true,
    },
  };
});
