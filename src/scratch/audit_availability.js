import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- ALL USERS AUDIT ---');
  const allUsers = await prisma.users.findMany({
    include: {
      role: true,
      staff_current_status: true
    }
  });

  allUsers.forEach(u => {
    console.log(`ID: ${u.id} | Name: ${u.name} | Role: ${u.role?.role_key} | Status: ${u.staff_current_status?.availability || 'NULL'}`);
  });

  console.log('\n--- SIMULATING API QUERY ---');
  const available = await prisma.users.findMany({
    where: {
      is_active: true,
      role: { role_key: 'delivery_staff' },
      NOT: {
        staff_current_status: {
          availability: { in: ['on_job', 'on_break', 'off_shift'] }
        }
      }
    }
  });

  console.log(`API Query returned ${available.length} users:`);
  available.forEach(u => console.log(` - ID: ${u.id} | Name: ${u.name}`));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
