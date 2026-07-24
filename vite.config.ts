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
  // preload helper landed inside the jspdf chunk, which made the entry and all
  // 120+ lazy chunks statically import ~460KB of PDF tooling on first paint.
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

  if (packageName === "@tanstack/react-query" || packageName === "@supabase/supabase-js" || packageName === "zustand") {
    return "data-clients";
  }

  // Radix packages get one chunk each (via the default vendor-* naming below)
  // instead of a single united chunk: the startup path only uses tooltip,
  // toast, and slot, and a shared chunk forced it to download every Radix
  // package used anywhere in the app (~39KB gz) before first render.

  if (packageName.startsWith("@dnd-kit/")) {
    return "dnd-kit";
  }

  if (packageName === "recharts" || packageName.startsWith("d3-")) {
    return "charts";
  }

  if (packageName === "victory-vendor") {
    return "charts";
  }

  if (packageName === "posthog-js" || packageName === "@vercel/analytics" || packageName === "@vercel/speed-insights") {
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

// The built stylesheet is ~400KB (60KB gz) and render-blocking, which delays
// the instant HTML shell's first paint. Swap it to a preload that upgrades to
// a stylesheet on load; main.tsx waits for it before mounting React so the app
// itself never renders unstyled.
function asyncAppCss() {
  return {
    name: "async-app-css",
    apply: "build" as const,
    transformIndexHtml: {
      order: "post" as const,
      handler(html: string) {
        return html.replace(
          /<link rel="stylesheet"([^>]*?)href="([^"]+\.css)"([^>]*?)>/g,
          (_match, pre: string, href: string, post: string) =>
            `<link rel="preload" as="style"${pre}href="${href}"${post} data-app-css onload="this.onload=null;this.rel='stylesheet'">` +
            `<noscript><link rel="stylesheet"${pre}href="${href}"${post}></noscript>`
        );
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [react(), asyncAppCss()];
  
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
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    preview: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
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
