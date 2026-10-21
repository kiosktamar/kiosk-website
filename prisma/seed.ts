import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../lib/generated/prisma/client';
import { seedDatabase } from './seed-data';

const phoneRegex = /^05\d{8}$/;

async function main() {
  const adminPhone = process.env.ADMIN_PHONE;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required to run seed');
  }

  if (!adminPhone || !phoneRegex.test(adminPhone)) {
    throw new Error(
      'ADMIN_PHONE must be a valid 10-digit Israeli mobile number starting with 05 (e.g. 0500000000)',
    );
  }

  if (!adminPassword || adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters long');
  }

  const adapter = new PrismaNeon({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    await seedDatabase(prisma, { adminPhone, adminPassword });
    console.error('Seed completed successfully');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
