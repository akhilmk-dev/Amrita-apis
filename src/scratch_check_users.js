import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.users.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role_id: true,
      role: {
        select: {
          name: true,
          role_key: true
        }
      }
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
