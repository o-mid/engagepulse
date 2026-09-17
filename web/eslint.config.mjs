import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import dsGuardrail from "./.better-design/eslint-design-system.mjs"; // better-design-guardrail

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: ["components/ui/**", ".next/**"],
  },
  ...dsGuardrail,
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
