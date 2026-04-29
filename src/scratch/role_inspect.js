import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const role3 = await prisma.roles.findUnique({
    where: { id: 3 },
    include: {
      role_permissions: {
        include: {
          permission: true
        }
      }
    }
  });

  console.log(`--- Permissions for ${role3.name} (3) ---`);
  console.log(JSON.stringify(role3.role_permissions.map(rp => `${rp.permission.module}.${rp.permission.action}`), null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
