import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Consolidating task permissions into update_status...');

  // 1. Get the ID for tasks.update_status
  const updateStatusPerm = await prisma.permissions.findFirst({
    where: { module: 'tasks', action: 'update_status' }
  });

  if (!updateStatusPerm) {
    throw new Error('tasks.update_status permission not found!');
  }

  // 2. Assign tasks.update_status to Delivery Staff (role 3)
  await prisma.role_permissions.upsert({
    where: { role_id_permission_id: { role_id: 3, permission_id: updateStatusPerm.id } },
    update: {},
    create: { role_id: 3, permission_id: updateStatusPerm.id }
  });
  console.log('✅ tasks.update_status assigned to Delivery Staff.');

  // 3. Remove the granular task permissions
  const granularActions = ['accept', 'reject', 'pickup', 'complete'];
  const granularPerms = await prisma.permissions.findMany({
    where: { module: 'tasks', action: { in: granularActions } }
  });

  if (granularPerms.length > 0) {
    const permIds = granularPerms.map(p => p.id);
    
    // Delete from role_permissions first
    await prisma.role_permissions.deleteMany({
      where: { permission_id: { in: permIds } }
    });
    
    // Then delete from permissions
    await prisma.permissions.deleteMany({
      where: { id: { in: permIds } }
    });
    console.log('✅ Granular task permissions removed.');
  }

  console.log('🎉 Consolidations completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Consolidation failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
