// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      // Downgraded to warn while the existing tree is burned down; a rule moves
      // back to "error" once its count reaches zero. Counts as of 2026-10-06
      // (55 warnings in total):
      "@typescript-eslint/no-unused-vars": "warn", // 7
      "@typescript-eslint/consistent-generic-constructors": "error",
      "@typescript-eslint/consistent-type-definitions": "warn", // 2
      "prefer-const": "error",
      "@typescript-eslint/prefer-for-of": "warn", // 1
      "@angular-eslint/prefer-inject": "warn", // 13
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/array-type": "error",
      "@typescript-eslint/no-empty-function": "warn", // 6
      "@typescript-eslint/class-literal-property-style": "warn", // 1
      "@angular-eslint/no-output-native": "warn", // 4
      "@angular-eslint/no-empty-lifecycle-method": "warn", // 1
      "@typescript-eslint/no-unused-expressions": "warn", // 1
    },
  },
  {
    files: ["**/*.spec.ts"],
    rules: {
      // Spec-only burn-down: 12 no-explicit-any + 7 array-type hits as of 2026-10-06.
      "@typescript-eslint/no-explicit-any": "warn", // 12
      "@typescript-eslint/array-type": "warn", // 7
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
  }
);
