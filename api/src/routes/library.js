const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

module.exports = (knexConfig) => {
  const environment = process.env.NODE_ENV || 'development';
  const knex = require('knex')(knexConfig[environment]);

  // Semua endpoint library dilindungi dengan authMiddleware
  router.use(authMiddleware);

  // Helper untuk set schema
  const setTenantSchema = async (req, res, next) => {
    const schemaName = process.env.DB_SCHEMA;
    await knex.schema.withSchema(schemaName).raw(`SET search_path TO ${schemaName}, public;`);
    next();
  };

  router.use(setTenantSchema);

  // ==========================================
  // ITEMS
  // ==========================================
  router.get('/items', async (req, res) => {
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
      const total = parseInt(totalResult.count, 10);

      let dataQuery = knex('items')
        .select('items.*', 'categories.name as category_name', 'suppliers.name as supplier_name')
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
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/items', async (req, res) => {
    try {
      const [id] = await knex('items').insert(req.body).returning('id');
      res.status(201).json({ id, message: 'Item created' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/items/:id', async (req, res) => {
    try {
      await knex('items').where('id', req.params.id).update(req.body);
      res.json({ message: 'Item updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/items/:id', async (req, res) => {
    try {
      await knex('items').where('id', req.params.id).del();
      res.json({ message: 'Item deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // CATEGORIES
  // ==========================================
  router.get('/categories', async (req, res) => {
    try {
      const search = req.query.search || '';
      let query = knex('categories');
      if (search) {
        query = query.where('name', 'ilike', `%${search}%`);
      }
      const categories = await query.orderBy('name', 'asc');
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/categories', async (req, res) => {
    try {
      const [id] = await knex('categories').insert(req.body).returning('id');
      res.status(201).json({ id, message: 'Category created' });
    } catch (error) {
      console.error('POST /categories error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/categories/:id', async (req, res) => {
    try {
      await knex('categories').where('id', req.params.id).update(req.body);
      res.json({ message: 'Category updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/categories/:id', async (req, res) => {
    try {
      await knex('categories').where('id', req.params.id).del();
      res.json({ message: 'Category deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // CUSTOMERS
  // ==========================================
  router.get('/customers', async (req, res) => {
    try {
      const search = req.query.search || '';
      let query = knex('customers');
      if (search) {
        query = query.where(function() {
          this.where('name', 'ilike', `%${search}%`)
              .orWhere('phone', 'ilike', `%${search}%`)
              .orWhere('email', 'ilike', `%${search}%`);
        });
      }
      const customers = await query.orderBy('id', 'desc');
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/customers', async (req, res) => {
    try {
      const [id] = await knex('customers').insert(req.body).returning('id');
      res.status(201).json({ id, message: 'Customer created' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/customers/:id', async (req, res) => {
    try {
      await knex('customers').where('id', req.params.id).update(req.body);
      res.json({ message: 'Customer updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/customers/:id', async (req, res) => {
    try {
      await knex('customers').where('id', req.params.id).del();
      res.json({ message: 'Customer deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // SUPPLIERS
  // ==========================================
  router.get('/suppliers', async (req, res) => {
    try {
      const search = req.query.search || '';
      let query = knex('suppliers');
      if (search) {
        query = query.where(function() {
          this.where('name', 'ilike', `%${search}%`)
              .orWhere('contact', 'ilike', `%${search}%`)
              .orWhere('phone', 'ilike', `%${search}%`);
        });
      }
      const suppliers = await query.orderBy('id', 'desc');
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/suppliers', async (req, res) => {
    try {
      const [id] = await knex('suppliers').insert(req.body).returning('id');
      res.status(201).json({ id, message: 'Supplier created' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/suppliers/:id', async (req, res) => {
    try {
      await knex('suppliers').where('id', req.params.id).update(req.body);
      res.json({ message: 'Supplier updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/suppliers/:id', async (req, res) => {
    try {
      await knex('suppliers').where('id', req.params.id).del();
      res.json({ message: 'Supplier deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // PAYMENT TYPES
  // ==========================================
  router.get('/payment-types', async (req, res) => {
    try {
      const paymentTypes = await knex('payment_types').orderBy('id', 'asc');
      res.json(paymentTypes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/payment-types', async (req, res) => {
    try {
      const { name, type, is_active } = req.body;
      const [id] = await knex('payment_types')
        .insert({ name, type, is_active: is_active ?? true })
        .returning('id');
      res.status(201).json({ id, message: 'Payment type created' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/payment-types/:id', async (req, res) => {
    try {
      const { name, type, is_active } = req.body;
      await knex('payment_types').where('id', req.params.id).update({ name, type, is_active });
      res.json({ message: 'Payment type updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/payment-types/:id', async (req, res) => {
    try {
      await knex('payment_types').where('id', req.params.id).del();
      res.json({ message: 'Payment type deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // DISCOUNTS (master diskon manual — FR-LIB-07)
  // ==========================================
  router.get('/discounts', async (req, res) => {
    try {
      const search = req.query.search || '';
      let query = knex('discounts');
      if (search) {
        query = query.where('name', 'ilike', `%${search}%`);
      }
      const discounts = await query.orderBy('id', 'desc');
      res.json(discounts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/discounts', async (req, res) => {
    try {
      const { name, type, value, max_value, is_active } = req.body;
      const [id] = await knex('discounts')
        .insert({ name, type, value, max_value: max_value ?? null, is_active: is_active ?? true })
        .returning('id');
      res.status(201).json({ id, message: 'Discount created' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/discounts/:id', async (req, res) => {
    try {
      const { name, type, value, max_value, is_active } = req.body;
      await knex('discounts')
        .where('id', req.params.id)
        .update({ name, type, value, max_value, is_active });
      res.json({ message: 'Discount updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/discounts/:id', async (req, res) => {
    try {
      await knex('discounts').where('id', req.params.id).del();
      res.json({ message: 'Discount deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
