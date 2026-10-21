import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Ensure .env.test is loaded
const envTestPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: true });
}

const databaseUrl = process.env.DATABASE_URL;
const testBranchHint = process.env.NEON_TEST_BRANCH_HINT;

if (!databaseUrl) {
  throw new Error('Integration tests safety check failed: DATABASE_URL is not defined in .env.test');
}

if (!testBranchHint) {
  throw new Error('Integration tests safety check failed: NEON_TEST_BRANCH_HINT is not defined in .env.test');
}

if (!databaseUrl.includes(testBranchHint)) {
  throw new Error(
    `Integration tests safety check failed: DATABASE_URL does not contain NEON_TEST_BRANCH_HINT ("${testBranchHint}"). Refusing to run tests against non-test database!`,
  );
}

// Check that it does not match .env DATABASE_URL
const envDevPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envDevPath)) {
  const devEnv = dotenv.parse(fs.readFileSync(envDevPath));
  if (devEnv.DATABASE_URL && devEnv.DATABASE_URL === databaseUrl) {
    throw new Error(
      'Integration tests safety check failed: DATABASE_URL in .env.test is identical to .env! Tests must run on a dedicated test branch.',
    );
  }
}
