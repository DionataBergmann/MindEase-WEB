import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  {
    ignores: [".next/**", "out/**", "node_modules/**", "*.config.*", "next-env.d.ts"],
  },
];
