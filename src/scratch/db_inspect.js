import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.roles.findMany();
  console.log('--- ROLES ---');
  console.log(JSON.stringify(roles, null, 2));

  const permissions = await prisma.permissions.findMany({
    orderBy: [
      { module: 'asc' },
      { action: 'asc' }
    ]
  });
  console.log('\n--- PERMISSIONS ---');
  console.log(JSON.stringify(permissions, null, 2));

  const rolePermissions = await prisma.role_permissions.findMany({
    include: {
      role: true,
      permission: true
    }
  });
  console.log('\n--- ROLE PERMISSIONS ---');
  // Just log counts per role to keep it clean
  const counts = {};
  rolePermissions.forEach(rp => {
    const key = `${rp.role.name} (${rp.role.id})`;
    counts[key] = (counts[key] || 0) + 1;
  });
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
