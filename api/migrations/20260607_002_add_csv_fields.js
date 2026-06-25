/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('items', table => {
    table.string('internal_id').unique();
    table.string('variant_name');
    table.string('brand_name');
    table.string('condition');
    table.text('image_url');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('items', table => {
    table.dropColumn('internal_id');
    table.dropColumn('variant_name');
    table.dropColumn('brand_name');
    table.dropColumn('condition');
    table.dropColumn('image_url');
  });
};
