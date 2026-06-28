import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    // 1. RBAC Guard - hanya admin yang bisa melihat laporan
    try {
      await requireRole('admin');
    } catch (authError: any) {
      return NextResponse.json({ success: false, message: authError.message || 'Unauthorized' }, { status: authError.status || 401 });
    }

    // 2. Ambil parameter tab dari URL
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'summary';
    // const dateRange = searchParams.get('range') || 'today'; // Untuk pengembangan ke depan

    let data: any = [];

    switch (tab) {
      case 'summary': {
        const totalTransactions = await prisma.transactions.count();
        const sumResult = await prisma.transactions.aggregate({ _sum: { total: true } });
        const revenue = Number(sumResult._sum.total || 0);
        const avg = totalTransactions > 0 ? revenue / totalTransactions : 0;
        
        data = [{
          date: 'All Time',
          total_transactions: totalTransactions,
          revenue: revenue,
          avg: avg
        }];
        break;
      }

      case 'gross-profit': {
        // Gross Profit = Net Sales - (QTY * current HPP)
        const rawResult = await prisma.$queryRaw<any[]>`
          SELECT 
            SUM(ti.qty * COALESCE(i.hpp, 0)) as total_cogs,
            SUM(ti.subtotal) as total_sales
          FROM transaction_items ti
          LEFT JOIN items i ON ti.item_id = i.id
        `;
        
        const total_sales = Number(rawResult[0]?.total_sales || 0);
        const total_cogs = Number(rawResult[0]?.total_cogs || 0);
        const gross_profit = total_sales - total_cogs;
        const margin = total_sales > 0 ? (gross_profit / total_sales) * 100 : 0;

        data = [{
          date: 'All Time',
          net_sales: total_sales,
          cogs: total_cogs,
          gross_profit: gross_profit,
          margin: margin
        }];
        break;
      }

      case 'payment-methods': {
        const result = await prisma.transactions.groupBy({
          by: ['payment_method_name'],
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
