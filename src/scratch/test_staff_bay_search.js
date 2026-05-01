import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSearch() {
  const search = 'Tower - 1'; 
  console.log(`Searching for: ${search}`);

  const where = {
    OR: [
      { name: { contains: search } },
      { qr_code: { contains: search } },
      { floor: { floor_name: { contains: search } } },
      { floor: { tower: { name: { contains: search } } } }
    ]
  };

  const [count, bays] = await Promise.all([
    prisma.staff_bays.count({ where }),
    prisma.staff_bays.findMany({
      where,
      include: {
        floor: {
          include: {
            tower: true
          }
        }
      }
    })
  ]);

  console.log(`Count: ${count}`);
  console.log('Results:', JSON.stringify(bays, null, 2));

  await prisma.$disconnect();
}

testSearch().catch(e => {
  console.error(e);
  process.exit(1);
});
