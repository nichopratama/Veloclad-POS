const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const crypto = require('crypto');

module.exports = (knexConfig) => {
  const environment = process.env.NODE_ENV || 'development';
  const knex = require('knex')(knexConfig[environment]);

  router.use(authMiddleware);
  // search_path di-set di level pool (knexfile afterCreate) — tidak ada race per-request.

  // GET POS Items (Top 10 / Search)
  router.get('/pos-items', async (req, res) => {
    try {
      const { search, limit } = req.query;
      const qLimit = parseInt(limit) || 30;
      
      if (search) {
        const items = await knex('items')
          .where('is_active', true)
          .andWhere(function() {
            this.where('name', 'ilike', `%${search}%`)
                .orWhere('code', 'ilike', `%${search}%`);
          })
          .limit(qLimit);
        return res.json(items);
      } else {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const topItemIdsResult = await knex('transaction_items')
          .select('transaction_items.item_id')
          .sum('transaction_items.qty as total_qty')
          .join('transactions', 'transaction_items.transaction_id', 'transactions.id')
          .where('transactions.created_at', '>=', oneMonthAgo)
          .where('transactions.status', 'completed')
          .groupBy('transaction_items.item_id')
          .orderBy('total_qty', 'desc')
          .limit(qLimit);

        if (topItemIdsResult.length === 0) {
          const items = await knex('items').where('is_active', true).limit(qLimit);
          return res.json(items);
        }

        const topItemIds = topItemIdsResult.map(r => r.item_id);
        const topItems = await knex('items')
          .whereIn('id', topItemIds)
          .andWhere('is_active', true);
        
        return res.json(topItems);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET All Transactions with Filters and Summary
  router.get('/transactions', async (req, res) => {
    try {
      const { startDate, endDate, search, status } = req.query;

      let query = knex('transactions')
        .select(
          'transactions.*',
          'users.name as cashier_name',
          'payment_types.name as payment_method'
        )
        .leftJoin('users', 'transactions.user_id', 'users.id')
        .leftJoin('payment_types', 'transactions.payment_type_id', 'payment_types.id')
        .orderBy('transactions.created_at', 'desc');

      if (status) {
        if (status === 'success') query = query.where('transactions.status', 'completed');
        else if (status === 'cancelled') query = query.where('transactions.status', 'cancelled');
        else if (status === 'void') query = query.where('transactions.status', 'void');
      }

      if (startDate) {
        query = query.where('transactions.created_at', '>=', startDate);
      }
      if (endDate) {
        query = query.where('transactions.created_at', '<=', endDate + ' 23:59:59');
      }

      if (search) {
        query = query.where('transactions.id', 'ilike', `%${search}%`);
      }

      const transactions = await query;

      let total_transactions = transactions.length;
      let total_collected = 0;
      let net_sales = 0;

      const transactionIds = transactions.map(t => t.id);
      let allItems = [];
      
      if (transactionIds.length > 0) {
        allItems = await knex('transaction_items')
          .select('transaction_items.transaction_id', 'transaction_items.item_id', 'items.name as item_name', 'transaction_items.qty', 'transaction_items.price')
          .leftJoin('items', 'transaction_items.item_id', 'items.id')
          .whereIn('transaction_id', transactionIds);
      }

      const itemsMap = {};
      const itemsDetailMap = {};
      allItems.forEach(item => {
        if (!itemsMap[item.transaction_id]) itemsMap[item.transaction_id] = [];
        if (!itemsDetailMap[item.transaction_id]) itemsDetailMap[item.transaction_id] = [];
        itemsMap[item.transaction_id].push(item.item_name || 'Unknown Item');
        itemsDetailMap[item.transaction_id].push(item);
      });

      let allVoidItems = [];
      if (transactionIds.length > 0) {
        allVoidItems = await knex('void_items')
          .select('void_items.transaction_id', 'items.name as item_name', 'void_items.qty', 'void_items.reason', 'users.name as executed_by')
          .leftJoin('items', 'void_items.item_id', 'items.id')
          .leftJoin('users', 'void_items.executed_by', 'users.id')
          .whereIn('transaction_id', transactionIds);
      }

      const voidItemsMap = {};
      allVoidItems.forEach(item => {
        if (!voidItemsMap[item.transaction_id]) voidItemsMap[item.transaction_id] = [];
        voidItemsMap[item.transaction_id].push(item);
      });

      transactions.forEach(trx => {
        if (trx.status === 'completed') {
           total_collected += parseFloat(trx.total || 0);
           net_sales += parseFloat(trx.net_sales || trx.total || 0);
        }
        const myItems = itemsMap[trx.id] || [];
        trx.items_summary = myItems.join(', ');
        trx.items_detail = itemsDetailMap[trx.id] || [];
        trx.voided_items = voidItemsMap[trx.id] || [];
        
        if (!trx.cashier_name) trx.cashier_name = trx.collected_by || 'System';
      });

      res.json({
        summary: {
          total_transactions,
          total_collected,
          net_sales
        },
        data: transactions
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET Void Items
  router.get('/void-items', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let query = knex('void_items')
        .select(
          'void_items.*',
          'items.name as item_name',
          'users.name as executed_by_name',
          'transactions.created_at as transaction_date'
        )
        .leftJoin('items', 'void_items.item_id', 'items.id')
        .leftJoin('users', 'void_items.executed_by', 'users.id')
        .leftJoin('transactions', 'void_items.transaction_id', 'transactions.id')
        .orderBy('void_items.created_at', 'desc');

      if (startDate) {
        query = query.where('void_items.created_at', '>=', startDate);
      }
      if (endDate) {
        query = query.where('void_items.created_at', '<=', endDate + ' 23:59:59');
      }

      const voidItems = await query;

      res.json({
        data: voidItems
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST New Transaction
  router.post('/transactions', async (req, res) => {
    const trx = await knex.transaction();
    try {
      const { items, payment_type_id, payment_amount, customer_id } = req.body;
      const user_id = req.user.id;

      // 1. Calculate totals
      let subtotal = 0;
      for (const item of items) {
        subtotal += (item.price * item.qty);
      }
      
      // Ambil pengaturan pajak dari database
      const taxSettings = await trx('tax_settings').first();
      let taxRate = 0;
      if (taxSettings && taxSettings.is_active) {
        taxRate = parseFloat(taxSettings.rate) / 100;
      }
      
      const tax_amount = subtotal * taxRate;
      const total = subtotal + tax_amount;
      const change_amount = payment_amount - total;

      if (payment_amount < total) {
        throw new Error('Payment amount is less than total');
      }

      // Generate Transaction ID (INV-YYYYMMDD-XXXX)
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const randomStr = crypto.randomBytes(2).toString('hex').toUpperCase();
      const transaction_id = `INV-${dateStr}-${randomStr}`;

      // 2. Insert Transaction
      await trx('transactions').insert({
        id: transaction_id,
        user_id,
        customer_id: customer_id || null,
        payment_type_id,
        subtotal,
        tax_amount,
        discount_amount: 0,
        total,
        net_sales: total,
        payment_amount,
        change_amount,
        status: 'completed'
      });

      // 3. Insert Items and Update Stock
      for (const item of items) {
        await trx('transaction_items').insert({
          transaction_id,
          item_id: item.id,
          price: item.price,
          qty: item.qty,
          subtotal: item.price * item.qty
        });

        // Kurangi stok
        await trx('items')
          .where('id', item.id)
          .decrement('stock', item.qty);
      }

      await trx.commit();
      res.status(201).json({ 
        message: 'Transaction successful', 
        transaction_id,
        receipt: {
          subtotal, tax_amount, total, payment_amount, change_amount
        }
      });
    } catch (error) {
      await trx.rollback();
      res.status(400).json({ error: error.message });
    }
  });

  // POST Void Items — void/refund hanya owner/admin (D7)
  router.post('/transactions/:id/void', requireRole('owner', 'admin'), async (req, res) => {
    const trx = await knex.transaction();
    try {
      const { id } = req.params;
      const { items, reason } = req.body; 
      const user_id = req.user.id;

      let total_refund = 0;

      for (const item of items) {
        if (item.qty <= 0) continue;
        
        await trx('void_items').insert({
          transaction_id: id,
          item_id: item.item_id,
          qty: item.qty,
          refund_amount: item.refund_amount,
          reason: reason || 'Returned Goods',
          executed_by: user_id
        });

        total_refund += item.refund_amount;

        // Kurangi stok jika dikembalikan
        if (reason === 'Returned Goods') {
          await trx('items')
            .where('id', item.item_id)
            .increment('stock', item.qty);
        }
      }

      if (total_refund > 0) {
        await trx('transactions')
          .where('id', id)
          .increment('refunds', total_refund)
          .decrement('net_sales', total_refund);
          
        const transaction = await trx('transactions').where('id', id).first();
        if (transaction && parseFloat(transaction.refunds) >= parseFloat(transaction.total)) {
           await trx('transactions').where('id', id).update({ status: 'void' });
        }
      }

      await trx.commit();
      res.status(200).json({ message: 'Void items processed successfully', total_refund });
    } catch (error) {
      await trx.rollback();
      res.status(400).json({ error: error.message });
    }
  });

  return router;
};
