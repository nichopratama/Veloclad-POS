const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

module.exports = (knexConfig) => {
  const environment = process.env.NODE_ENV || 'development';
  const knex = require('knex')(knexConfig[environment]);

  // Semua endpoint dashboard dilindungi dengan authMiddleware
  router.use(authMiddleware);
  // search_path di-set di level pool (knexfile afterCreate) — tidak ada race per-request.

  // 1. Get Summary Cards
  router.get('/summary', async (req, res) => {
    try {
      // Data statis atau dummy untuk sementara sampai ada transaksi
      // Total Penjualan hari ini
      const schemaName = process.env.DB_SCHEMA;
      
      const salesResult = await knex('transactions')
        .withSchema(schemaName)
        .where('status', 'completed')
        .whereRaw('DATE(created_at) = CURRENT_DATE')
        .sum('total as totalSales')
        .count('id as transactionCount');

      // Total Produk
      const itemResult = await knex('items')
        .withSchema(schemaName)
        .where('is_active', true)
        .count('id as totalItems');

      res.json({
        totalSales: salesResult[0].totalSales || 0,
        transactionCount: salesResult[0].transactionCount || 0,
        totalItems: itemResult[0].totalItems || 0,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  // 2. Sales Chart
  router.get('/sales-chart', async (req, res) => {
    try {
      const schemaName = process.env.DB_SCHEMA;
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      // Query sum of total grouped by local date (YYYY-MM-DD)
      const salesResult = await knex('transactions')
        .withSchema(schemaName)
        .select(knex.raw("to_char(created_at, 'YYYY-MM-DD') as sales_date"))
        .sum('total as daily_sales')
        .where('status', 'completed')
        .where('created_at', '>=', sevenDaysAgo)
        .groupBy(knex.raw("to_char(created_at, 'YYYY-MM-DD')"));

      const salesMap = {};
      salesResult.forEach(row => {
        salesMap[row.sales_date] = parseFloat(row.daily_sales) || 0;
      });

      const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const chartData = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const dayName = daysOfWeek[d.getDay()];
        
        chartData.push({
          date: dayName,
          sales: salesMap[dateStr] || 0
        });
      }

      res.json(chartData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch sales chart' });
    }
  });

  // 3. Top Items
  router.get('/top-items', async (req, res) => {
    try {
      const { period } = req.query; // 'today' or 'month'
      const schemaName = process.env.DB_SCHEMA;
      
      let dateFilter = knex.raw('DATE(transactions.created_at) = CURRENT_DATE');
      if (period === 'month') {
        dateFilter = knex.raw('EXTRACT(MONTH FROM transactions.created_at) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM transactions.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)');
      }

      const topItems = await knex('transaction_items')
        .withSchema(schemaName)
        .select(
          'items.name',
          knex.raw('SUM(transaction_items.qty) as qty'),
          knex.raw('SUM(transaction_items.subtotal) as revenue')
        )
        .join('transactions', 'transaction_items.transaction_id', 'transactions.id')
        .join('items', 'transaction_items.item_id', 'items.id')
        .where('transactions.status', 'completed')
        .andWhere(dateFilter)
        .groupBy('items.name')
        .orderBy('qty', 'desc')
        .limit(5);

      res.json(topItems);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch top items' });
    }
  });

  return router;
};
