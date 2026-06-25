const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

module.exports = (knexConfig) => {
  const environment = process.env.NODE_ENV || 'development';
  const knex = require('knex')(knexConfig[environment]);

  router.use(authMiddleware);

  const setTenantSchema = async (req, res, next) => {
    const schemaName = process.env.DB_SCHEMA;
    await knex.schema.withSchema(schemaName).raw(`SET search_path TO ${schemaName}, public;`);
    next();
  };

  router.use(setTenantSchema);

  // 1. Get Store Settings
  router.get('/store', async (req, res) => {
    try {
      const store = await knex('store_settings').first() || {};
      const tax = await knex('tax_settings').first() || {};
      const receipt = await knex('receipt_settings').first() || {};
      
      res.json({
        store_name: store.name || '',
        address: store.address || '',
        phone: store.phone || '',
        email: store.email || '',
        tax_rate: tax.rate || 0,
        is_tax_active: tax.is_active === undefined ? true : tax.is_active,
        receipt_footer: receipt.footer || ''
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Update Store Settings
  router.put('/store', async (req, res) => {
    try {
      const { store_name, address, phone, email, tax_rate, is_tax_active, receipt_footer } = req.body;
      
      // Update Store
      const store = await knex('store_settings').first();
      if (store) {
        await knex('store_settings').update({ name: store_name || '', address, phone, email });
      } else {
        await knex('store_settings').insert({ name: store_name || 'My Store', address, phone, email });
      }

      // Update Tax
      const tax = await knex('tax_settings').first();
      if (tax) {
        await knex('tax_settings').update({ rate: tax_rate, is_active: is_tax_active });
      } else {
        await knex('tax_settings').insert({ name: 'PPN', rate: tax_rate, is_active: is_tax_active !== undefined ? is_tax_active : true });
      }

      // Update Receipt
      const receipt = await knex('receipt_settings').first();
      if (receipt) {
        await knex('receipt_settings').update({ footer: receipt_footer });
      } else {
        await knex('receipt_settings').insert({ footer: receipt_footer });
      }

      res.json({ message: 'Store settings updated' });
    } catch (error) {
      console.error("Settings Update Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
