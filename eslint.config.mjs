import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These two React Compiler rules flag the ordinary "fetch on mount"
      // client-component pattern (setState from a useEffect) and computing
      // the current time in a dynamic server component — both correct and
      // used deliberately throughout this app. Kept as warnings rather than
      // build-breaking errors rather than restructuring every data-fetching
      // effect around Suspense/use() for a single-user internal tool.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
