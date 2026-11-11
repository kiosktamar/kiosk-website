import 'server-only';
import { prisma } from '@/lib/db';
import { AuthService } from './AuthService';
import { UserService } from './UserService';

export const services = {
  auth: new AuthService(prisma),
  users: new UserService(prisma),
  // runs 4 and 5 add: kiosk, inventory, orders, stats
};
