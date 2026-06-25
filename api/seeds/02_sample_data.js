const crypto = require('crypto');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Hanya masukkan sample data jika tabel items masih kosong
  const existingItems = await knex('items').select('id').limit(1);
  if (existingItems.length > 0) {
    console.log('Sample data sudah ada, melewati proses seed 02.');
    return;
  }

  // 1. Kategori Tambahan
  let categories = await knex('categories').select('id', 'name');
  if (categories.length < 5) {
    const newCategories = await knex('categories').insert([
      { name: 'Kopi & Susu', description: 'Minuman berbasis kopi' },
      { name: 'Makanan Berat', description: 'Nasi, Mie, dll' },
      { name: 'Cemilan', description: 'Snack ringan' }
    ]).returning(['id', 'name']);
    categories = [...categories, ...newCategories];
  }

  // Helper untuk mencari ID Kategori
  const getCatId = (name) => {
    const cat = categories.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
    return cat ? cat.id : categories[0].id; // Fallback ke kategori pertama
  };

  // 2. Suppliers
  const suppliers = await knex('suppliers').insert([
    { name: 'PT Indo Biji Kopi', contact: 'Budi', phone: '08123456789', email: 'budi@indokopi.com' },
    { name: 'CV Segar Sayur', contact: 'Ani', phone: '08198765432', email: 'ani@segarsayur.com' }
  ]).returning('id');

  // 3. Items (Produk)
  const items = await knex('items').insert([
    { code: 'ITM-001', name: 'Kopi Susu Gula Aren', price: 25000, hpp: 10000, stock: 150, min_stock: 20, unit: 'Cup', category_id: getCatId('kopi'), supplier_id: suppliers[0].id },
    { code: 'ITM-002', name: 'Nasi Goreng Spesial', price: 35000, hpp: 15000, stock: 50, min_stock: 10, unit: 'Porsi', category_id: getCatId('makanan'), supplier_id: suppliers[1].id },
    { code: 'ITM-003', name: 'Americano Dingin', price: 20000, hpp: 8000, stock: 100, min_stock: 15, unit: 'Cup', category_id: getCatId('kopi'), supplier_id: suppliers[0].id },
    { code: 'ITM-004', name: 'Kentang Goreng', price: 18000, hpp: 7000, stock: 80, min_stock: 20, unit: 'Porsi', category_id: getCatId('cemilan'), supplier_id: suppliers[1].id },
    { code: 'ITM-005', name: 'Teh Tarik', price: 15000, hpp: 5000, stock: 120, min_stock: 30, unit: 'Cup', category_id: getCatId('minuman'), supplier_id: suppliers[0].id },
    { code: 'ITM-006', name: 'Mie Goreng Seafood', price: 40000, hpp: 18000, stock: 40, min_stock: 5, unit: 'Porsi', category_id: getCatId('makanan'), supplier_id: suppliers[1].id }
  ]).returning(['id', 'price', 'hpp']);

  // 4. Customers
  const customers = await knex('customers').insert([
    { name: 'Andi Saputra', phone: '08111222333', email: 'andi@example.com', points: 150 },
    { name: 'Siti Aminah', phone: '08555444333', email: 'siti@example.com', points: 300 }
  ]).returning('id');

  // 5. Transactions (Dummy Sales History untuk 7 hari terakhir agar Dashboard ada grafiknya)
  const users = await knex('users').select('id').first();
  const paymentTypes = await knex('payment_types').select('id');
  const paymentTypeId = paymentTypes.length > 0 ? paymentTypes[0].id : null;

  if (users && paymentTypeId) {
    const today = new Date();
    
    for (let i = 0; i < 15; i++) {
      // Random tanggal dalam 7 hari terakhir
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - Math.floor(Math.random() * 7));
      
      const dateStr = pastDate.toISOString().slice(0,10).replace(/-/g,'');
      const randomStr = crypto.randomBytes(2).toString('hex').toUpperCase();
      const transaction_id = `INV-${dateStr}-${randomStr}`;

      // Ambil 2 produk random
      const randomItem1 = items[Math.floor(Math.random() * items.length)];
      const randomItem2 = items[Math.floor(Math.random() * items.length)];

      const qty1 = Math.floor(Math.random() * 3) + 1;
      const qty2 = Math.floor(Math.random() * 2) + 1;

      const subtotal = (randomItem1.price * qty1) + (randomItem2.price * qty2);
      const tax_amount = subtotal * 0.11;
      const total = subtotal + tax_amount;

      await knex('transactions').insert({
        id: transaction_id,
        user_id: users.id,
        customer_id: Math.random() > 0.5 ? customers[0].id : null,
        payment_type_id: paymentTypeId,
        subtotal,
        tax_amount,
        discount_amount: 0,
        total,
        payment_amount: total + 10000, // pura-pura uang lebih
        change_amount: 10000,
        status: 'completed',
        created_at: pastDate
      });

      await knex('transaction_items').insert([
        { transaction_id, item_id: randomItem1.id, price: randomItem1.price, qty: qty1, subtotal: randomItem1.price * qty1 },
        { transaction_id, item_id: randomItem2.id, price: randomItem2.price, qty: qty2, subtotal: randomItem2.price * qty2 }
      ]);
    }
  }

  console.log('Sample data berhasil dimasukkan!');
};
