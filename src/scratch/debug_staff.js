import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.users.findMany({
    where: {
      role: {
        role_key: 'delivery_staff'
      }
    },
    include: {
      staff_current_status: true,
      role: true
    }
  });
  console.log(JSON.stringify(staff, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
