import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const role1 = await prisma.roles.findUnique({
    where: { id: 1 },
    include: {
      role_permissions: {
        include: {
          permission: true
        }
      }
    }
  });

  console.log(`--- Permissions for ${role1.name} (1) ---`);
  const perms = role1.role_permissions.map(rp => `${rp.permission.module}.${rp.permission.action}`);
  console.log(JSON.stringify(perms, null, 2));

  const hasUsers = perms.some(p => p.startsWith('users.'));
  console.log(`Has users module permissions: ${hasUsers}`);
  
  const hasStaffManage = perms.includes('staff.manage');
  console.log(`Has staff.manage: ${hasStaffManage}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
