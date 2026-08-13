import { defineConfig, type Plugin } from "vite";
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

function getPackageName(id: string) {
  const nodeModulesIndex = id.lastIndexOf("node_modules/");
  if (nodeModulesIndex === -1) {
    return null;
  }

  const packagePath = id.slice(nodeModulesIndex + "node_modules/".length);
  const parts = packagePath.split("/");

  if (parts[0]?.startsWith("@") && parts[1]) {
    return `${parts[0]}/${parts[1]}`;
  }

  return parts[0] ?? null;
}

function sanitizeChunkName(value: string) {
  return value.replace(/^@/, "").replace(/[\\/]/g, "-");
}

function getManualChunk(id: string) {
  // Vite's dynamic-import preload helper (and Rollup's commonjs helpers) are
  // referenced by every lazy chunk. Left to Rollup's default placement the
  // preload helper lands inside the jspdf chunk, which makes the entry and all
  // 120+ lazy chunks statically import ~340KB (107KB gz) of PDF tooling before
  // first paint — on every page, whether or not it ever exports a PDF.
  // Pin the helpers to react-core, which every chunk already depends on.
  if (id.includes("vite/preload-helper") || id.includes("commonjsHelpers")) {
    return "react-core";
  }

  const packageName = getPackageName(id);
  if (!packageName) {
    return undefined;
  }

  if (
    packageName === "react" ||
    packageName === "react-dom" ||
    packageName === "scheduler" ||
    packageName === "use-sync-external-store" ||
    packageName === "react-router" ||
    packageName === "react-router-dom" ||
    packageName === "@remix-run/router" ||
    packageName === "react-helmet-async" ||
    packageName === "react-fast-compare" ||
    packageName === "react-transition-group" ||
    packageName === "invariant" ||
    packageName === "shallowequal" ||
    packageName === "detect-node-es" ||
    packageName === "dom-helpers"
  ) {
    return "react-core";
  }

  if (
    packageName.startsWith("@supabase/") ||
    packageName === "@tanstack/react-query" ||
    packageName === "@tanstack/query-core" ||
    packageName === "zustand"
  ) {
    return "data-clients";
  }

  if (packageName.startsWith("@radix-ui/")) {
    return "radix-ui";
  }

  if (
    packageName === "aria-hidden" ||
    packageName === "tslib" ||
    packageName === "get-nonce" ||
    packageName === "react-style-singleton" ||
    packageName === "react-remove-scroll-bar" ||
    packageName === "react-remove-scroll" ||
    packageName === "use-sidecar" ||
    packageName === "use-callback-ref" ||
    packageName.startsWith("@floating-ui/") ||
    packageName === "clsx" ||
    packageName === "class-variance-authority" ||
    packageName === "tailwind-merge" ||
    packageName === "lucide-react" ||
    packageName === "next-themes" ||
    packageName === "sonner"
  ) {
    return "ui-foundation";
  }

  if (packageName === "framer-motion" || packageName === "motion-dom" || packageName === "motion-utils") {
    return "motion";
  }

  if (packageName.startsWith("@dnd-kit/")) {
    return "dnd-kit";
  }

  if (packageName === "recharts" || packageName.startsWith("d3-")) {
    return "charts";
  }

  if (packageName === "victory-vendor") {
    return "charts";
  }

  if (packageName === "posthog-js") {
    // Preserve the dynamic import boundary in analytics.ts. Assigning PostHog
    // to a manual chunk makes Rollup add it back to the entry preload graph.
    return undefined;
  }

  if (packageName === "@vercel/analytics" || packageName === "@vercel/speed-insights") {
    return "analytics";
  }

  if (
    packageName.startsWith("micromark") ||
    packageName.startsWith("mdast-util") ||
    packageName.startsWith("hast-util") ||
    packageName.startsWith("unist-util") ||
    packageName.startsWith("remark") ||
    packageName.startsWith("rehype") ||
    packageName.startsWith("vfile") ||
    packageName === "property-information" ||
    packageName === "html-url-attributes" ||
    packageName === "space-separated-tokens" ||
    packageName === "comma-separated-tokens" ||
    packageName === "decode-named-character-reference" ||
    packageName === "trim-lines" ||
    packageName === "markdown-table" ||
    packageName === "longest-streak" ||
    packageName === "ccount" ||
    packageName === "zwitch" ||
    packageName === "bail" ||
    packageName === "trough" ||
    packageName === "devlop" ||
    packageName === "is-plain-obj"
  ) {
    return "markdown";
  }

  if (packageName === "jspdf" || packageName === "html2canvas" || packageName === "docx" || packageName === "pptxgenjs" || packageName === "fabric") {
    return `document-tools-${sanitizeChunkName(packageName)}`;
  }

  return `vendor-${sanitizeChunkName(packageName)}`;
}

function needsCrossOriginIsolation(requestUrl: string | undefined) {
  if (!requestUrl) return false;
  const pathname = new URL(requestUrl, "http://localhost").pathname;
  return pathname === "/mvp-builder" || pathname.startsWith("/mvp-builder/");
}

function selectiveCrossOriginIsolation(): Plugin {
  return {
    name: "selective-cross-origin-isolation",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (needsCrossOriginIsolation(request.url)) {
          response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          response.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (needsCrossOriginIsolation(request.url)) {
          response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          response.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [react(), selectiveCrossOriginIsolation()];
  
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
    esbuild: mode === "production" ? {
      pure: ["console.log", "console.debug"],
    } : undefined,
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
          manualChunks: getManualChunk,
          // Use [hash] for long-term caching rather than an ever-changing timestamp
          entryFileNames: `assets/[name].[hash].js`,
          chunkFileNames: `assets/[name].[hash].js`,
          assetFileNames: `assets/[name].[hash].[ext]`,
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 500,
      // Add sourcemap for debugging (can be disabled in production)
      sourcemap: false,
    },
  };
});
