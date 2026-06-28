import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allPaymentTypes = await prisma.payment_types.findMany({
    where: { is_active: true }
  });

  const result = await prisma.transactions.groupBy({
    by: ['payment_method_name'],
    _count: { id: true },
    _sum: { total: true }
  });

  const totalSalesAll = result.reduce((acc, curr) => acc + Number(curr._sum.total || 0), 0);
  const paymentsMap = new Map<string, { count: number, total: number }>();

  // Initialize with all active payment types
  allPaymentTypes.forEach(pt => paymentsMap.set(pt.name, { count: 0, total: 0 }));

  // Add actual transaction data
  result.forEach(r => {
    const method = r.payment_method_name || 'Unknown';
    const total = Number(r._sum.total || 0);
    const count = r._count.id;
    
    if (paymentsMap.has(method)) {
      const existing = paymentsMap.get(method)!;
      existing.total += total;
      existing.count += count;
    } else {
      paymentsMap.set(method, { count, total });
    }
  });

  const data = Array.from(paymentsMap.entries()).map(([method, stats]) => {
    return {
      method,
      count: stats.count,
      total: stats.total,
      percentage: totalSalesAll > 0 ? (stats.total / totalSalesAll) * 100 : 0
    };
  }).sort((a, b) => b.total - a.total);
  
  console.log(JSON.stringify(data, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
