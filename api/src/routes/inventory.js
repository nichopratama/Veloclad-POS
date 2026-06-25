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

  // 1. Stock Summary (Join with Categories & Suppliers)
  router.get('/stock-summary', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';

      let countQuery = knex('items');
      if (search) {
        countQuery = countQuery.where(function() {
          this.where('name', 'ilike', `%${search}%`)
              .orWhere('code', 'ilike', `%${search}%`);
        });
      }
      const totalResult = await countQuery.count('id as count').first();
      const total = parseInt(totalResult.count);
      const totalPages = Math.ceil(total / limit);

      let dataQuery = knex('items')
        .select(
          'items.id', 'items.code', 'items.name', 'items.stock', 'items.min_stock', 'items.unit',
          'categories.name as category_name',
          'suppliers.name as supplier_name'
        )
        .leftJoin('categories', 'items.category_id', 'categories.id')
        .leftJoin('suppliers', 'items.supplier_id', 'suppliers.id');

      if (search) {
        dataQuery = dataQuery.where(function() {
          this.where('items.name', 'ilike', `%${search}%`)
              .orWhere('items.code', 'ilike', `%${search}%`);
        });
      }

      const items = await dataQuery
        .orderBy('items.name', 'asc')
        .limit(limit)
        .offset(offset);

      res.json({
        data: items,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Purchase Orders (GET & POST)
  router.get('/purchase-orders', async (req, res) => {
    try {
      const pos = await knex('purchase_orders')
        .select('purchase_orders.*', 'suppliers.name as supplier_name', 'users.name as created_by')
        .leftJoin('suppliers', 'purchase_orders.supplier_id', 'suppliers.id')
        .leftJoin('users', 'purchase_orders.user_id', 'users.id')
        .orderBy('purchase_orders.created_at', 'desc');
      res.json(pos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/purchase-orders', requireRole('owner', 'admin'), async (req, res) => {
    const trx = await knex.transaction();
    try {
      const { supplier_id, notes, items } = req.body;
      const user_id = req.user.id;

      let total_amount = 0;
      for (const item of items) {
        total_amount += (item.cost * item.qty);
      }

      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const randomStr = crypto.randomBytes(2).toString('hex').toUpperCase();
      const po_number = `PO-${dateStr}-${randomStr}`;

      const [po_id] = await trx('purchase_orders').insert({
        po_number,
        supplier_id,
        user_id,
        status: 'pending',
        total_amount,
        notes
      }).returning('id');

      for (const item of items) {
        await trx('po_items').insert({
          po_id: po_id.id || po_id, // depends on pg returning array of objects vs pg array of ints
          item_id: item.item_id,
          qty: item.qty,
          cost: item.cost,
          subtotal: item.cost * item.qty
        });
      }

      await trx.commit();
      res.status(201).json({ message: 'PO created', po_number });
    } catch (error) {
      await trx.rollback();
      res.status(400).json({ error: error.message });
    }
  });

  // 3. Receive PO
  router.patch('/purchase-orders/:id/receive', requireRole('owner', 'admin'), async (req, res) => {
    const trx = await knex.transaction();
    try {
      const po_id = req.params.id;
      
      const po = await trx('purchase_orders').where('id', po_id).first();
      if (!po || po.status !== 'pending') {
        throw new Error('PO not found or already received');
      }

      const poItems = await trx('po_items').where('po_id', po_id);
      
      for (const item of poItems) {
        // Increase stock
        await trx('items').where('id', item.item_id).increment('stock', item.qty);
      }

      await trx('purchase_orders').where('id', po_id).update({ status: 'received' });
      await trx.commit();
      
      res.json({ message: 'PO received and stock updated' });
    } catch (error) {
      await trx.rollback();
      res.status(400).json({ error: error.message });
    }
  });

  // 4. Stock Adjustments
  router.get('/adjustments', async (req, res) => {
    try {
      const adjs = await knex('stock_adjustments')
        .select('stock_adjustments.*', 'items.name as item_name', 'users.name as user_name')
        .leftJoin('items', 'stock_adjustments.item_id', 'items.id')
        .leftJoin('users', 'stock_adjustments.user_id', 'users.id')
        .orderBy('stock_adjustments.created_at', 'desc');
      res.json(adjs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/adjustments', requireRole('owner', 'admin'), async (req, res) => {
    const trx = await knex.transaction();
    try {
      const { item_id, qty_change, reason, notes } = req.body;
      const user_id = req.user.id;

      await trx('stock_adjustments').insert({
        item_id, user_id, qty_change, reason, notes
      });

      if (qty_change > 0) {
        await trx('items').where('id', item_id).increment('stock', qty_change);
      } else {
        await trx('items').where('id', item_id).decrement('stock', Math.abs(qty_change));
      }

      await trx.commit();
      res.status(201).json({ message: 'Stock adjusted' });
    } catch (error) {
      await trx.rollback();
      res.status(400).json({ error: error.message });
    }
  });

  return router;
};
