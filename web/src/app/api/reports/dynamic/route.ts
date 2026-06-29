import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    try {
      await requireRole('admin');
    } catch (authError: any) {
      return NextResponse.json({ success: false, message: authError.message || 'Unauthorized' }, { status: authError.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'summary';
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    // Reports only count completed transactions (voided sales are excluded everywhere).
    let dateFilter: Prisma.transactionsWhereInput = { status: 'completed' };
    let rawDateWhere = Prisma.sql`WHERE t.status = 'completed'`;
    let labelDate = 'All Time';

    if (startDate && endDate) {
      // Local date parsing. Assuming the input is YYYY-MM-DD
      const startObj = new Date(`${startDate}T00:00:00.000Z`);
      const endObj = new Date(`${endDate}T23:59:59.999Z`);

      dateFilter = {
        status: 'completed',
        created_at: {
          gte: startObj,
          lte: endObj
        }
      };

      rawDateWhere = Prisma.sql`WHERE t.status = 'completed' AND t.created_at >= ${startObj} AND t.created_at <= ${endObj}`;
      labelDate = `${startDate} - ${endDate}`;
    }

    let data: any = [];

    switch (tab) {
      case 'summary': {
        const totalTransactions = await prisma.transactions.count({ where: dateFilter });
        const sumResult = await prisma.transactions.aggregate({
          where: dateFilter,
          _sum: {
            subtotal: true,
            discount_amount: true,
            refunds: true,
            net_sales: true,
            tax_amount: true,
            total: true
          }
        });

        // Get gross sales by category
        const categoryResult = await prisma.$queryRaw<any[]>`
          SELECT 
            c.name as category_name,
            SUM(ti.qty * ti.price) as gross_sales
          FROM transaction_items ti
          LEFT JOIN items i ON ti.item_id = i.id
          LEFT JOIN categories c ON i.category_id = c.id
          LEFT JOIN transactions t ON ti.transaction_id = t.id
          ${rawDateWhere}
          GROUP BY c.id, c.name
          ORDER BY gross_sales DESC
        `;

        const categories = categoryResult.map(c => ({
          category_name: c.category_name || 'Uncategorized',
          amount: Number(c.gross_sales || 0)
        }));

        // Get COGS — use the per-line cost_price snapshot (consistent with the
        // Finance income statement), not the live items.hpp which drifts over time.
        const cogsResult = await prisma.$queryRaw<any[]>`
          SELECT SUM(ti.qty * ti.cost_price) as total_cogs
          FROM transaction_items ti
          LEFT JOIN transactions t ON ti.transaction_id = t.id
          ${rawDateWhere}
        `;
        const total_cogs = Number(cogsResult[0]?.total_cogs || 0);

        // Get payment methods
        const allPaymentTypes = await prisma.payment_types.findMany({
          where: { is_active: true }
        });

        const paymentsResult = await prisma.transactions.groupBy({
          by: ['payment_method_name'],
          where: dateFilter,
          _sum: { total: true }
        });

        const paymentsMap = new Map<string, number>();
        // Initialize all known active payment types with 0
        allPaymentTypes.forEach(pt => paymentsMap.set(pt.name, 0));

        // Add actual transaction amounts
        paymentsResult.forEach(p => {
          const method = p.payment_method_name || 'Unknown';
          const amount = Number(p._sum.total || 0);
          if (paymentsMap.has(method)) {
            paymentsMap.set(method, paymentsMap.get(method)! + amount);
          } else {
            paymentsMap.set(method, amount);
          }
        });

        const payments = Array.from(paymentsMap.entries()).map(([method, amount]) => ({
          method,
          amount
        })).sort((a, b) => b.amount - a.amount);

        const total = Number(sumResult._sum.total || 0);
        const avg = totalTransactions > 0 ? total / totalTransactions : 0;

        data = {
          date: labelDate,
          invoices: totalTransactions,
          avg_ticket: avg,
          gross_sales_categories: categories,
          discounts: Number(sumResult._sum.discount_amount || 0),
          refunds: Number(sumResult._sum.refunds || 0),
          net_sales: Number(sumResult._sum.net_sales || 0),
          cogs: total_cogs,
          tax: Number(sumResult._sum.tax_amount || 0),
          total_collected: total,
          payment_methods: payments
        };
        break;
      }

      case 'gross-profit': {
        const rawResult = await prisma.$queryRaw<any[]>`
          SELECT
            TO_CHAR(t.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') as trx_date,
            SUM(ti.qty * ti.cost_price) as total_cogs,
            SUM(ti.subtotal) as total_sales
          FROM transaction_items ti
          LEFT JOIN transactions t ON ti.transaction_id = t.id
          ${rawDateWhere}
          GROUP BY TO_CHAR(t.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD')
          ORDER BY trx_date DESC
        `;

        data = rawResult.map(row => {
          const total_sales = Number(row.total_sales || 0);
          const total_cogs = Number(row.total_cogs || 0);
          const gross_profit = total_sales - total_cogs;
          const margin = total_sales > 0 ? (gross_profit / total_sales) * 100 : 0;

          return {
            date: row.trx_date || 'Unknown Date',
            net_sales: total_sales,
            cogs: total_cogs,
            gross_profit: gross_profit,
            margin: margin
          };
        });
        break;
      }

      case 'payment-methods': {
        const allPaymentTypes = await prisma.payment_types.findMany({
          where: { is_active: true }
        });

        const result = await prisma.transactions.groupBy({
          by: ['payment_method_name'],
          where: dateFilter,
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

        data = Array.from(paymentsMap.entries()).map(([method, stats]) => {
          return {
            method,
            count: stats.count,
            total: stats.total,
            percentage: totalSalesAll > 0 ? (stats.total / totalSalesAll) * 100 : 0
          };
        }).sort((a, b) => b.total - a.total);
        break;
      }

      case 'payment-methods-detail': {
        const methodName = searchParams.get('methodName');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        
        if (!methodName) {
          return NextResponse.json({ success: false, message: 'Missing methodName' }, { status: 400 });
        }

        const filter = {
          ...dateFilter,
          payment_method_name: methodName === 'Unknown' ? null : methodName
        };

        const skip = (page - 1) * limit;

        const [total, result] = await Promise.all([
          prisma.transactions.count({ where: filter }),
          prisma.transactions.findMany({
            where: filter,
            select: {
              id: true,
              created_at: true,
              cashier_name: true,
              total: true,
              status: true,
              transaction_items: {
                select: {
                  price: true,
                  qty: true,
                  discount: true,
                  subtotal: true,
                  items: {
                    select: { name: true }
                  }
                }
              }
            },
            orderBy: { created_at: 'desc' },
            skip,
            take: limit
          })
        ]);

        return NextResponse.json({
          success: true,
          data: result,
          pagination: {
            total,
            totalPages: Math.ceil(total / limit),
            page,
            limit
          }
        });
      }

      case 'items-sales': {
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const skip = (page - 1) * limit;

        const countResult = await prisma.$queryRaw<any[]>`
          SELECT COUNT(DISTINCT i.id) as total
          FROM transaction_items ti
          LEFT JOIN items i ON ti.item_id = i.id
          LEFT JOIN transactions t ON ti.transaction_id = t.id
          ${rawDateWhere}
        `;
        const total = Number(countResult[0]?.total || 0);

        const result = await prisma.$queryRaw<any[]>`
          SELECT 
            i.name as item_name,
            c.name as category_name,
            SUM(ti.qty) as total_qty,
            SUM(ti.subtotal) as total_sales
          FROM transaction_items ti
          LEFT JOIN items i ON ti.item_id = i.id
          LEFT JOIN categories c ON i.category_id = c.id
          LEFT JOIN transactions t ON ti.transaction_id = t.id
          ${rawDateWhere}
          GROUP BY i.id, i.name, c.name
          ORDER BY total_qty DESC
          LIMIT ${limit} OFFSET ${skip}
        `;

        return NextResponse.json({
          success: true,
          data: result.map(r => ({
            item_name: r.item_name || 'Deleted Item',
            category_name: r.category_name || 'No Category',
            total_qty: Number(r.total_qty || 0),
            total_sales: Number(r.total_sales || 0)
          })),
          pagination: {
            total,
            totalPages: Math.ceil(total / limit),
            page,
            limit
          }
        });
      }

      case 'category-sales': {
        const allCategories = await prisma.categories.findMany();

        const result = await prisma.$queryRaw<any[]>`
          SELECT 
            c.name as category_name,
            SUM(ti.qty) as total_qty,
            SUM(ti.subtotal) as total_sales
          FROM transaction_items ti
          LEFT JOIN items i ON ti.item_id = i.id
          LEFT JOIN categories c ON i.category_id = c.id
          LEFT JOIN transactions t ON ti.transaction_id = t.id
          ${rawDateWhere}
          GROUP BY c.id, c.name
          ORDER BY total_sales DESC
        `;

        const totalSalesAll = result.reduce((acc, curr) => acc + Number(curr.total_sales || 0), 0);

        const categoryMap = new Map<string, { total_qty: number, total_sales: number }>();
        allCategories.forEach(c => categoryMap.set(c.name, { total_qty: 0, total_sales: 0 }));

        result.forEach(r => {
          const category_name = r.category_name || 'Tanpa Kategori';
          const total_qty = Number(r.total_qty || 0);
          const total_sales = Number(r.total_sales || 0);
          
          if (categoryMap.has(category_name)) {
            const existing = categoryMap.get(category_name)!;
            existing.total_qty += total_qty;
            existing.total_sales += total_sales;
          } else {
            categoryMap.set(category_name, { total_qty, total_sales });
          }
        });

        data = Array.from(categoryMap.entries()).map(([category_name, stats]) => {
          return {
            category_name,
            total_qty: stats.total_qty,
            total_sales: stats.total_sales,
            percentage: totalSalesAll > 0 ? (stats.total_sales / totalSalesAll) * 100 : 0
          };
        }).sort((a, b) => b.total_sales - a.total_sales);
        break;
      }

      case 'category-items-detail': {
        const categoryName = searchParams.get('categoryName');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const skip = (page - 1) * limit;
        
        if (!categoryName) {
          return NextResponse.json({ success: false, message: 'Missing categoryName' }, { status: 400 });
        }

        const isUncategorized = categoryName === 'Tanpa Kategori';

        // Base where condition for raw query
        const dateConditionRaw = (startDate && endDate) 
          ? `t.created_at >= '${startDate} 00:00:00' AND t.created_at <= '${endDate} 23:59:59'`
          : `1=1`;
        const categoryConditionRaw = isUncategorized 
          ? `c.id IS NULL` 
          : `c.name = '${categoryName.replace(/'/g, "''")}'`;

        const countResult = await prisma.$queryRawUnsafe<any[]>(`
          SELECT COUNT(DISTINCT i.id) as total
          FROM transaction_items ti
          LEFT JOIN items i ON ti.item_id = i.id
          LEFT JOIN categories c ON i.category_id = c.id
          LEFT JOIN transactions t ON ti.transaction_id = t.id
          WHERE t.status = 'completed' AND ${dateConditionRaw} AND ${categoryConditionRaw}
        `);
        
        const total = Number(countResult[0]?.total || 0);

        const result = await prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            i.name as item_name,
            c.name as category_name,
            SUM(ti.qty) as total_qty,
            SUM(ti.subtotal) as total_sales
          FROM transaction_items ti
          LEFT JOIN items i ON ti.item_id = i.id
          LEFT JOIN categories c ON i.category_id = c.id
          LEFT JOIN transactions t ON ti.transaction_id = t.id
          WHERE t.status = 'completed' AND ${dateConditionRaw} AND ${categoryConditionRaw}
          GROUP BY i.id, i.name, c.name
          ORDER BY total_qty DESC
          LIMIT ${limit} OFFSET ${skip}
        `);

        return NextResponse.json({
          success: true,
          data: result.map(r => ({
            item_name: r.item_name || 'Deleted Item',
            category_name: r.category_name || 'Tanpa Kategori',
            total_qty: Number(r.total_qty || 0),
            total_sales: Number(r.total_sales || 0)
          })),
          pagination: {
            total,
            totalPages: Math.ceil(total / limit),
            page,
            limit
          }
        });
      }

      case 'staff-sales': {
        const allStaff = await prisma.users.findMany({
          select: { name: true }
        });

        const result = await prisma.transactions.groupBy({
          by: ['cashier_name'],
          where: dateFilter,
          _count: { id: true },
          _sum: { total: true }
        });

        const salesMap = new Map();
        for (const r of result) {
          if (r.cashier_name) salesMap.set(r.cashier_name, { count: r._count.id, total: Number(r._sum.total || 0) });
        }

        const staffData = allStaff.map(staff => ({
          staff_name: staff.name,
          count: salesMap.get(staff.name)?.count || 0,
          total: salesMap.get(staff.name)?.total || 0
        }));

        for (const r of result) {
          if (r.cashier_name && !allStaff.find(s => s.name === r.cashier_name)) {
            staffData.push({
              staff_name: r.cashier_name,
              count: r._count.id,
              total: Number(r._sum.total || 0)
            });
          }
        }

        data = staffData.sort((a, b) => b.total - a.total);
        break;
      }

      default:
        return NextResponse.json({ success: false, message: 'Invalid tab type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('[REPORTS_API_ERROR]', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch report data',
      error: error.message
    }, { status: 500 });
  }
}
