import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: './tsconfig.json',
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Add custom rules here
      "indent": ["error", 2],
      "linebreak-style": ["error", "unix"],
      "quotes": ["error", "double"],
      "semi": ["error", "always"],
      "@typescript-eslint/no-explicit-any": "off", // Allow any for flexibility
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }], // Warn on unused vars, ignore args starting with _
    },
  },
];