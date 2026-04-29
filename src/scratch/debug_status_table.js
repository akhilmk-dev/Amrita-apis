import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const statuses = await prisma.staff_current_status.findMany();
  console.log(JSON.stringify(statuses, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
