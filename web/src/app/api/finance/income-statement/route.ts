import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireRole('admin');
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    const startObj = new Date(`${start}T00:00:00.000Z`);
    const endObj = new Date(`${end}T23:59:59.999Z`);

    const dateFilter = {
      created_at: {
        gte: startObj,
        lte: endObj,
      },
      status: 'completed'
    };

    // 1. Net Sales from transactions
    const salesAgg = await prisma.transactions.aggregate({
      where: dateFilter,
      _sum: {
        net_sales: true,  // stored net_sales is tax-INCLUSIVE (= total − refunds)
        tax_amount: true, // strip tax to get true net sales (revenue excludes VAT)
      }
    });
    // Revenue = net sales excluding tax (gross − discount − refund). VAT is a
    // liability to remit, not revenue, so it must not inflate gross/net profit.
    const netSales = Number(salesAgg._sum.net_sales || 0) - Number(salesAgg._sum.tax_amount || 0);

    // 2. COGS from transactions
    const rawDateWhere = Prisma.sql`WHERE t.created_at >= ${startObj} AND t.created_at <= ${endObj} AND t.status = 'completed'`;
    const cogsResult = await prisma.$queryRaw<any[]>`
      SELECT SUM(ti.qty * COALESCE(ti.cost_price, 0)) as total_cogs
      FROM transaction_items ti
      LEFT JOIN transactions t ON ti.transaction_id = t.id
      ${rawDateWhere}
    `;
    const cogs = Number(cogsResult[0]?.total_cogs || 0);

    // 3. Expenses
    const expenseDateFilter = {
      expense_date: {
        gte: new Date(start),
        lte: new Date(end),
      }
    };
    
    // Group expenses by category
    const expenseGroups = await prisma.expenses.groupBy({
      by: ['category_id'],
      where: expenseDateFilter,
      _sum: { amount: true }
    });
    
    // Get category names
    const categories = await prisma.expense_categories.findMany();
    const catMap = new Map(categories.map(c => [c.id, { name: c.name, code: c.account_code }]));

    const expensesList = expenseGroups.map(eg => ({
      category_id: eg.category_id,
      category_name: catMap.get(eg.category_id)?.name || 'Unknown',
      account_code: catMap.get(eg.category_id)?.code || null,
      total: Number(eg._sum.amount || 0),
    }));

    const totalExpenses = expensesList.reduce((sum, e) => sum + e.total, 0);

    const grossProfit = netSales - cogs;
    const netProfit = grossProfit - totalExpenses;

    return NextResponse.json({
      data: {
        revenue: {
          net_sales: netSales,
        },
        cogs: {
          total: cogs,
        },
        gross_profit: grossProfit,
        expenses: {
          list: expensesList,
          total: totalExpenses,
        },
        net_profit: netProfit,
      }
    });

  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/finance/income-statement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
