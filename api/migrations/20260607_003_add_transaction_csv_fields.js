/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('transactions', table => {
    table.string('outlet');
    table.decimal('refunds', 14, 2).defaultTo(0);
    table.decimal('net_sales', 14, 2).defaultTo(0);
    table.decimal('gratuity', 14, 2).defaultTo(0);
    table.text('notes');
    table.string('cashier_name');
    table.string('customer_name');
    table.string('customer_phone');
    table.string('payment_method_name');
    table.string('event_type');
    table.text('reason_of_refund');
    
    // We already have subtotal, tax_amount, discount_amount, total, payment_amount, change_amount.
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('transactions', table => {
    table.dropColumn('outlet');
    table.dropColumn('refunds');
    table.dropColumn('net_sales');
    table.dropColumn('gratuity');
    table.dropColumn('notes');
    table.dropColumn('cashier_name');
    table.dropColumn('customer_name');
    table.dropColumn('customer_phone');
    table.dropColumn('payment_method_name');
    table.dropColumn('event_type');
    table.dropColumn('reason_of_refund');
  });
};
