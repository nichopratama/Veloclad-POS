import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';

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
      }
    };

    // 1. Cash In (dari transactions, anggap semua total adalah kas riil yg diterima)
    const salesAgg = await prisma.transactions.aggregate({
      where: dateFilter,
      _sum: { total: true }
    });
    const cashInSales = Number(salesAgg._sum.total || 0);

    // 2. Cash Out: Accounts Payable Payments
    const apAgg = await prisma.payable_payments.aggregate({
      where: {
        payment_date: {
          gte: startObj,
          lte: endObj,
        }
      },
      _sum: { amount: true }
    });
    const cashOutPayables = Number(apAgg._sum.amount || 0);

    // 3. Cash Out: Expenses
    const expenseAgg = await prisma.expenses.aggregate({
      where: {
        expense_date: {
          gte: new Date(start),
          lte: new Date(end),
        }
      },
      _sum: { amount: true }
    });
    const cashOutExpenses = Number(expenseAgg._sum.amount || 0);

    const totalCashIn = cashInSales;
    const totalCashOut = cashOutPayables + cashOutExpenses;
    const netCashFlow = totalCashIn - totalCashOut;

    return NextResponse.json({
      data: {
        cash_in: {
          sales: cashInSales,
          total: totalCashIn,
        },
        cash_out: {
          payables: cashOutPayables,
          expenses: cashOutExpenses,
          total: totalCashOut,
        },
        net_cash_flow: netCashFlow,
      }
    });

  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/finance/cash-flow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
