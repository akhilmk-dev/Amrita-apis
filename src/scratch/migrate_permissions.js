import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Permission Migration...');

  // 1. Add new task permissions
  const taskActions = ['accept', 'reject', 'pickup', 'complete'];
  for (const action of taskActions) {
    await prisma.permissions.upsert({
      where: { module_action: { module: 'tasks', action } },
      update: {},
      create: {
        module: 'tasks',
        action,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} a task`
      }
    });
  }
  console.log('✅ Task permissions added.');

  // 2. Add manage and assign_role to staff module
  const staffActions = ['manage', 'assign_role'];
  for (const action of staffActions) {
    await prisma.permissions.upsert({
      where: { module_action: { module: 'staff', action } },
      update: {},
      create: {
        module: 'staff',
        action,
        description: action === 'manage' ? 'Create, edit, deactivate staff/users' : 'Assign roles to staff/users'
      }
    });
  }
  console.log('✅ Staff management permissions added.');

  // 3. Assign new task permissions to Super Admin (1), PMS Admin (2), and Delivery Staff (3)
  const taskPerms = await prisma.permissions.findMany({
    where: { module: 'tasks', action: { in: taskActions } }
  });

  for (const roleId of [1, 2, 3]) {
    for (const perm of taskPerms) {
      await prisma.role_permissions.upsert({
        where: { role_id_permission_id: { role_id: roleId, permission_id: perm.id } },
        update: {},
        create: { role_id: roleId, permission_id: perm.id }
      });
    }
  }
  console.log('✅ Task permissions assigned to roles.');

  // 4. Migrate users module permissions to staff module
  const usersPerms = await prisma.permissions.findMany({
    where: { module: 'users' }
  });

  const staffPerms = await prisma.permissions.findMany({
    where: { module: 'staff' }
  });

  const mapping = {
    'view': 'view',
    'manage': 'manage',
    'assign_role': 'assign_role'
  };

  for (const uPerm of usersPerms) {
    const sAction = mapping[uPerm.action];
    if (sAction) {
      const sPerm = staffPerms.find(p => p.action === sAction);
      if (sPerm) {
        // Find everyone who has the user permission
        const rps = await prisma.role_permissions.findMany({
          where: { permission_id: uPerm.id }
        });

        for (const rp of rps) {
          await prisma.role_permissions.upsert({
            where: { role_id_permission_id: { role_id: rp.role_id, permission_id: sPerm.id } },
            update: {},
            create: { role_id: rp.role_id, permission_id: sPerm.id }
          });
        }
      }
    }
  }
  console.log('✅ User permissions migrated to staff module.');

  // 5. Delete users module permissions
  // First delete role_permissions
  await prisma.role_permissions.deleteMany({
    where: { permission_id: { in: usersPerms.map(p => p.id) } }
  });
  // Then delete permissions
  await prisma.permissions.deleteMany({
    where: { module: 'users' }
  });
  console.log('✅ Users module removed from permissions table.');

  console.log('🎉 Migration completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
