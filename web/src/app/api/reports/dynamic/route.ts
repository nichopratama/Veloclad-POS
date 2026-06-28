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

    let dateFilter = {};
    let rawDateWhere = Prisma.empty;
    let labelDate = 'All Time';

    if (startDate && endDate) {
      // Local date parsing. Assuming the input is YYYY-MM-DD
      const startObj = new Date(`${startDate}T00:00:00.000Z`);
      const endObj = new Date(`${endDate}T23:59:59.999Z`);
      
      dateFilter = {
        created_at: {
          gte: startObj,
          lte: endObj
        }
      };

      rawDateWhere = Prisma.sql`WHERE t.created_at >= ${startObj} AND t.created_at <= ${endObj}`;
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

        // Get COGS
        const cogsResult = await prisma.$queryRaw<any[]>`
          SELECT SUM(ti.qty * COALESCE(i.hpp, 0)) as total_cogs
          FROM transaction_items ti
          LEFT JOIN items i ON ti.item_id = i.id
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
            SUM(ti.qty * COALESCE(i.hpp, 0)) as total_cogs,
            SUM(ti.subtotal) as total_sales
          FROM transaction_items ti
          LEFT JOIN items i ON ti.item_id = i.id
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
        const result = await prisma.transactions.groupBy({
          by: ['payment_method_name'],
          where: dateFilter,
          _count: { id: true },
          _sum: { total: true }
        });
        
        const totalSalesAll = result.reduce((acc, curr) => acc + Number(curr._sum.total || 0), 0);

        data = result.map(r => {
          const total = Number(r._sum.total || 0);
          return {
            method: r.payment_method_name || 'Unknown',
            count: r._count.id,
            total: total,
            percentage: totalSalesAll > 0 ? (total / totalSalesAll) * 100 : 0
          };
        }).sort((a, b) => b.total - a.total);
        break;
      }

      case 'payment-methods-detail': {
        const methodName = searchParams.get('methodName');
        if (!methodName) {
          return NextResponse.json({ success: false, message: 'Missing methodName' }, { status: 400 });
        }
        
        const filter = {
          ...dateFilter,
          payment_method_name: methodName === 'Unknown' ? null : methodName
        };
        
        const result = await prisma.transactions.findMany({
          where: filter,
          select: {
            id: true,
            created_at: true,
            cashier_name: true,
            total: true,
            status: true
          },
          orderBy: { created_at: 'desc' },
          take: 500 // Limit to avoid massive payload
        });
        
        data = result;
        break;
      }

      case 'items-sales': {
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
          LIMIT 100
        `;
        
        data = result.map(r => ({
          item_name: r.item_name || 'Deleted Item',
          category_name: r.category_name || 'No Category',
          total_qty: Number(r.total_qty || 0),
          total_sales: Number(r.total_sales || 0)
        }));
        break;
      }

      case 'category-sales': {
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

        data = result.map(r => ({
          category_name: r.category_name || 'Uncategorized',
          total_qty: Number(r.total_qty || 0),
          total_sales: Number(r.total_sales || 0)
        }));
        break;
      }

      case 'staff-sales': {
        const result = await prisma.transactions.groupBy({
          by: ['cashier_name'],
          where: dateFilter,
          _count: { id: true },
          _sum: { total: true }
        });

        data = result.map(r => ({
          staff_name: r.cashier_name || 'Unknown Staff',
          count: r._count.id,
          total: Number(r._sum.total || 0)
        })).sort((a, b) => b.total - a.total);
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
