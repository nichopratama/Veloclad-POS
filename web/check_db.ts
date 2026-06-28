import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const paymentTypes = await prisma.payment_types.findMany();
  console.log('paymentTypes count:', paymentTypes.length);
  console.log(paymentTypes);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
