import nextConfig from 'eslint-config-next';

const eslintConfig = [
  {
    ignores: ['lib/generated/**', '.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...nextConfig,
  {
    rules: {
      'no-console': ['error', { allow: ['error'] }],
    },
  },
];

export default eslintConfig;
