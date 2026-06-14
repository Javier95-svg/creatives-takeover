import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// ── Design-system guardrail ─────────────────────────────────────────────
// Flags hardcoded colors / arbitrary spacing+type that bypass the token set.
// See DESIGN_SYSTEM.md for the tokens to use instead. Decorative wallpapers
// and the vendored ui/ primitives are exempted (override block below).
const DESIGN_VALUE_PATTERNS = [
  {
    // Raw Tailwind palette utilities, e.g. text-gray-500, dark:bg-blue-600
    re: /(?:text|bg|border|ring|from|to|via|fill|stroke|divide|outline|decoration|placeholder|caret|accent|shadow)-(?:gray|slate|zinc|neutral|stone|blue|red|green|emerald|teal|indigo|purple|amber|yellow|orange|cyan|sky|rose|violet|lime|fuchsia|pink)-\d{2,3}\b/,
    msg: "a raw Tailwind palette color (e.g. text-gray-500)",
    hint: "use a semantic token: text-muted-foreground, bg-muted, border-border, or a status color (warning/info/success/destructive)",
  },
  {
    // Hardcoded hex inside an arbitrary class, e.g. bg-[#0e121f]
    re: /-\[#[0-9a-fA-F]{3,8}\]/,
    msg: "a hardcoded hex color",
    hint: "define it as an HSL var in index.css and reference the token",
  },
  {
    // Arbitrary spacing / sizing / type, e.g. w-[280px], text-[14px], gap-[18px]
    re: /(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|w|h|min-w|min-h|max-w|max-h|text|leading|rounded|space-x|space-y|top|bottom|left|right|inset)-\[\d/,
    msg: "an arbitrary spacing/size/type value",
    hint: "use the nearest scale step (4px grid) or the type scale (text-sm, text-headline-lg)",
  },
];

const TRACKED_CALLEES = new Set(["cn", "clsx", "cva", "twMerge", "tw", "classNames"]);

function isInTrackedContext(node, sourceCode) {
  const ancestors = sourceCode.getAncestors(node);
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const a = ancestors[i];
    if (a.type === "JSXAttribute" && a.name && a.name.name === "className") return true;
    if (a.type === "CallExpression" && a.callee) {
      const name = a.callee.name || (a.callee.property && a.callee.property.name);
      if (name && TRACKED_CALLEES.has(name)) return true;
    }
  }
  return false;
}

function reportIfHardcoded(node, raw, context) {
  for (const { re, msg, hint } of DESIGN_VALUE_PATTERNS) {
    if (re.test(raw)) {
      context.report({
        node,
        message: `Avoid ${msg} in className. ${hint}. See DESIGN_SYSTEM.md.`,
      });
      return;
    }
  }
}

const designSystem = {
  rules: {
    "no-hardcoded-design-values": {
      meta: {
        type: "problem",
        docs: { description: "Disallow hardcoded colors and arbitrary spacing/type in className; use design tokens." },
        schema: [],
      },
      create(context) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        return {
          Literal(node) {
            if (typeof node.value !== "string" || !node.value.includes("-")) return;
            if (!isInTrackedContext(node, sourceCode)) return;
            reportIfHardcoded(node, node.value, context);
          },
          TemplateElement(node) {
            const raw = node.value && node.value.raw;
            if (!raw || !raw.includes("-")) return;
            if (!isInTrackedContext(node, sourceCode)) return;
            reportIfHardcoded(node, raw, context);
          },
        };
      },
    },
  },
};

export default tseslint.config(
  // Only these dirs are covered by tsconfig.app.json; linting type-aware rules
  // outside them throws "parserOptions.project" parse errors. Lint the app source.
  { ignores: ["dist", "api/**", "bizmap-chatbot-package/**", "scripts/**", "supabase/**", "tests/**", "*.config.{ts,js}", "middleware.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      ct: designSystem,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "no-console": ["warn", {
        "allow": ["warn", "error"]
      }],
      "prefer-const": "error",
      "no-var": "error",
      // Starts at "warn" so CI stays green; flip to "error" once top offenders are migrated.
      "ct/no-hardcoded-design-values": "warn",
    },
  },
  {
    // Exempt decorative art layers, vendored ui/ primitives, and stories.
    // Wallpapers/backgrounds use literal hex/gradients by design; ui/ primitives
    // (shadcn) are token-driven for color but use deliberate arbitrary values
    // (e.g. 44px touch targets); chart.tsx needs literal series colors (Recharts).
    files: [
      "src/components/wallpapers/**",
      "src/components/ui/**",
      "src/components/AnimatedBackground.tsx",
      "src/components/MessagesBackground.tsx",
      "src/components/**/*Background.tsx",
      "src/components/**/*Wallpaper.tsx",
      "**/*.stories.{ts,tsx}",
    ],
    rules: {
      "ct/no-hardcoded-design-values": "off",
    },
  }
);
