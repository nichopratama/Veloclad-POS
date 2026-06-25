/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema
    // 1. Users
    .createTable('users', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('role').defaultTo('kasir'); // owner, kasir, admin
      table.string('phone');
      table.string('avatar');
      table.timestamps(true, true);
    })
    
    // 2. Store Settings
    .createTable('store_settings', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('address');
      table.string('phone');
      table.string('logo');
      table.string('currency').defaultTo('IDR');
      table.string('timezone').defaultTo('Asia/Jakarta');
      table.timestamps(true, true);
    })

    // 3. Tax Settings
    .createTable('tax_settings', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.decimal('rate', 5, 2).notNullable();
      table.boolean('is_inclusive').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })

    // 4. Receipt Settings
    .createTable('receipt_settings', table => {
      table.increments('id').primary();
      table.text('header');
      table.text('footer');
      table.boolean('show_tax').defaultTo(true);
      table.boolean('show_discount').defaultTo(true);
      table.timestamps(true, true);
    })

    // 5. Categories
    .createTable('categories', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('description');
      table.timestamps(true, true);
    })

    // 6. Suppliers
    .createTable('suppliers', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('contact');
      table.string('phone');
      table.string('email');
      table.text('address');
      table.string('npwp');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })

    // 7. Customers
    .createTable('customers', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('phone');
      table.string('email');
      table.text('address');
      table.integer('points').defaultTo(0);
      table.timestamps(true, true);
    })

    // 8. Items
    .createTable('items', table => {
      table.increments('id').primary();
      table.string('code').unique().notNullable();
      table.string('name').notNullable();
      table.integer('category_id').unsigned().references('id').inTable('categories');
      table.string('unit').defaultTo('pcs');
      table.decimal('hpp', 14, 2).defaultTo(0);
      table.decimal('price', 14, 2).notNullable();
      table.integer('min_stock').defaultTo(0);
      table.integer('supplier_id').unsigned().references('id').inTable('suppliers');
      table.integer('stock').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })

    // 9. Payment Types
    .createTable('payment_types', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('type').notNullable(); // cash, qris, transfer, card
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })

    // 10. Promos
    .createTable('promos', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('type').notNullable(); // percentage, nominal
      table.decimal('value', 14, 2).notNullable();
      table.decimal('min_purchase', 14, 2).defaultTo(0);
      table.datetime('start_date');
      table.datetime('end_date');
      table.timestamps(true, true);
    })

    // 11. Discounts
    .createTable('discounts', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('type').notNullable(); // percentage, nominal
      table.decimal('value', 14, 2).notNullable();
      table.decimal('max_value', 14, 2);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })

    // 12. Transactions
    .createTable('transactions', table => {
      table.string('id').primary(); // UUID or Custom string
      table.integer('user_id').unsigned().references('id').inTable('users');
      table.integer('customer_id').unsigned().references('id').inTable('customers');
      table.integer('payment_type_id').unsigned().references('id').inTable('payment_types');
      table.decimal('subtotal', 14, 2).notNullable();
      table.decimal('tax_amount', 14, 2).defaultTo(0);
      table.decimal('discount_amount', 14, 2).defaultTo(0);
      table.decimal('total', 14, 2).notNullable();
      table.decimal('payment_amount', 14, 2).notNullable();
      table.decimal('change_amount', 14, 2).defaultTo(0);
      table.string('status').defaultTo('completed'); // completed, cancelled
      table.timestamps(true, true);
    })

    // 13. Transaction Items
    .createTable('transaction_items', table => {
      table.increments('id').primary();
      table.string('transaction_id').references('id').inTable('transactions').onDelete('CASCADE');
      table.integer('item_id').unsigned().references('id').inTable('items');
      table.decimal('price', 14, 2).notNullable();
      table.integer('qty').notNullable();
      table.decimal('subtotal', 14, 2).notNullable();
      table.timestamps(true, true);
    })

    // 14. Purchase Orders
    .createTable('purchase_orders', table => {
      table.increments('id').primary();
      table.string('po_number').unique().notNullable();
      table.integer('supplier_id').unsigned().references('id').inTable('suppliers');
      table.integer('user_id').unsigned().references('id').inTable('users');
      table.string('status').defaultTo('pending'); // pending, received, cancelled
      table.decimal('total_amount', 14, 2).defaultTo(0);
      table.text('notes');
      table.timestamps(true, true);
    })

    // 15. PO Items
    .createTable('po_items', table => {
      table.increments('id').primary();
      table.integer('po_id').unsigned().references('id').inTable('purchase_orders').onDelete('CASCADE');
      table.integer('item_id').unsigned().references('id').inTable('items');
      table.integer('qty').notNullable();
      table.decimal('cost', 14, 2).notNullable();
      table.decimal('subtotal', 14, 2).notNullable();
    })

    // 16. Stock Adjustments
    .createTable('stock_adjustments', table => {
      table.increments('id').primary();
      table.integer('item_id').unsigned().references('id').inTable('items');
      table.integer('user_id').unsigned().references('id').inTable('users');
      table.integer('qty_change').notNullable();
      table.string('reason').notNullable();
      table.text('notes');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema
    .dropTableIfExists('stock_adjustments')
    .dropTableIfExists('po_items')
    .dropTableIfExists('purchase_orders')
    .dropTableIfExists('transaction_items')
    .dropTableIfExists('transactions')
    .dropTableIfExists('discounts')
    .dropTableIfExists('promos')
    .dropTableIfExists('payment_types')
    .dropTableIfExists('items')
    .dropTableIfExists('customers')
    .dropTableIfExists('suppliers')
    .dropTableIfExists('categories')
    .dropTableIfExists('receipt_settings')
    .dropTableIfExists('tax_settings')
    .dropTableIfExists('store_settings')
    .dropTableIfExists('users');
};
