/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('void_items', table => {
    table.increments('id').primary();
    table.string('transaction_id').references('id').inTable('transactions').onDelete('CASCADE');
    table.integer('item_id').unsigned().references('id').inTable('items');
    table.integer('qty').notNullable();
    table.decimal('refund_amount', 14, 2).notNullable();
    table.string('reason').notNullable();
    table.integer('executed_by').unsigned().references('id').inTable('users');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('void_items');
};
