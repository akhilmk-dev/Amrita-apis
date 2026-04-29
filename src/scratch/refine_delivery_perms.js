import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Refining Delivery Staff permissions...');

  // 1. Find permission IDs
  const updateStatusPerm = await prisma.permissions.findFirst({
    where: { module: 'tasks', action: 'update_status' }
  });
  
  const updateOwnPerm = await prisma.permissions.findFirst({
    where: { module: 'delivery', action: 'update_own' }
  });

  const acceptRejectPerm = await prisma.permissions.findFirst({
    where: { module: 'delivery', action: 'accept_reject' }
  });

  // 2. Remove tasks.update_status from role 3
  if (updateStatusPerm) {
    await prisma.role_permissions.deleteMany({
      where: { role_id: 3, permission_id: updateStatusPerm.id }
    });
    console.log('✅ tasks.update_status removed from Delivery Staff.');
  }

  // 3. Ensure delivery.update_own and delivery.accept_reject are assigned to role 3
  if (updateOwnPerm) {
    await prisma.role_permissions.upsert({
      where: { role_id_permission_id: { role_id: 3, permission_id: updateOwnPerm.id } },
      update: {},
      create: { role_id: 3, permission_id: updateOwnPerm.id }
    });
  }

  if (acceptRejectPerm) {
    await prisma.role_permissions.upsert({
      where: { role_id_permission_id: { role_id: 3, permission_id: acceptRejectPerm.id } },
      update: {},
      create: { role_id: 3, permission_id: acceptRejectPerm.id }
    });
  }
  console.log('✅ delivery module permissions ensured for Delivery Staff.');

  console.log('🎉 Refinement completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Refinement failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
