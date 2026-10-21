import { prisma } from '@/lib/db';
import { seedDatabase } from '@/prisma/seed-data';

export const testPrisma = prisma;

export async function resetDatabase(): Promise<void> {
  const adminPhone = process.env.ADMIN_PHONE || '0500000000';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin-password-123';

  // Truncate all 10 tables with RESTART IDENTITY CASCADE
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "OrderItemToppings",
      "OrderItems",
      "Orders",
      "ComboComponents",
      "ProductToppings",
      "Toppings",
      "Products",
      "Categories",
      "KioskSettings",
      "Users"
    RESTART IDENTITY CASCADE;
  `);

  await seedDatabase(prisma, { adminPhone, adminPassword });
}
