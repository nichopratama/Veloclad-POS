/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('store_settings', 'email');
  if (!hasColumn) {
    await knex.schema.alterTable('store_settings', table => {
      table.string('email');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('store_settings', table => {
    table.dropColumn('email');
  });
};
