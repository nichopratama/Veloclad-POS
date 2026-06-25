const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Hanya seed jika tabel kosong
  
  // 1. Payment Types
  const paymentTypes = await knex('payment_types').select('id');
  if (paymentTypes.length === 0) {
    await knex('payment_types').insert([
      { name: 'Tunai', type: 'cash' },
      { name: 'QRIS', type: 'qris' },
      { name: 'Transfer Bank', type: 'transfer' },
      { name: 'Kartu Debit', type: 'card' }
    ]);
  }

  // 2. Categories
  const categories = await knex('categories').select('id');
  if (categories.length === 0) {
    await knex('categories').insert([
      { name: 'Makanan Umum', description: 'Kategori makanan' },
      { name: 'Minuman Umum', description: 'Kategori minuman' },
      { name: 'Lain-lain', description: 'Kategori umum lainnya' }
    ]);
  }

  // 3. Admin User
  const users = await knex('users').select('id');
  if (users.length === 0) {
    const password_hash = await bcrypt.hash('Admin123!', 10);
    // Kita gunakan TENANT_SLUG untuk generate email awal
    const tenantSlug = process.env.TENANT_SLUG || 'default';
    await knex('users').insert([
      { 
        name: 'Super Admin', 
        email: `admin@${tenantSlug}.local`, 
        password_hash, 
        role: 'owner' 
      }
    ]);
  }

  // 4. Store Settings
  const storeSettings = await knex('store_settings').select('id');
  if (storeSettings.length === 0) {
    await knex('store_settings').insert([
      {
        name: process.env.TENANT_NAME || 'My POS Store',
        currency: process.env.STORE_CURRENCY || 'IDR',
        timezone: process.env.STORE_TIMEZONE || 'Asia/Jakarta'
      }
    ]);
  }

  // 5. Tax Settings
  const taxSettings = await knex('tax_settings').select('id');
  if (taxSettings.length === 0) {
    await knex('tax_settings').insert([
      {
        name: 'PPN',
        rate: process.env.STORE_TAX_RATE || 11.00,
        is_inclusive: process.env.STORE_TAX_INCLUSIVE === 'true'
      }
    ]);
  }
};
