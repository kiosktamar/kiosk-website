import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './tests/helpers/server-only-stub.ts'),
    },
  },
  test: {
    fileParallelism: false,
    passWithNoTests: true,
    hookTimeout: 60000,
    testTimeout: 60000,
    workspace: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['lib/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          hookTimeout: 60000,
          testTimeout: 60000,
          setupFiles: ['tests/helpers/setup-integration.ts'],
        },
      },
    ],
  },
});
