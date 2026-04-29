import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allUsers = await prisma.users.findMany({
    include: {
      staff_current_status: true,
      role: true
    }
  });
  console.log(JSON.stringify(allUsers, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
