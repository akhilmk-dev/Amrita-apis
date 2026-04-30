import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.roles.findMany();
  console.log(JSON.stringify(roles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
