require('dotenv').config({ path: '../.env' });
const knexConfig = require('../knexfile');
const environment = process.env.NODE_ENV || 'development';
const knex = require('knex')(knexConfig[environment]);

async function setupTenant() {
  const tenantId = process.env.TENANT_ID;
  const tenantName = process.env.TENANT_NAME;
  const tenantSlug = process.env.TENANT_SLUG;
  const schemaName = process.env.DB_SCHEMA;

  if (!tenantId || !schemaName) {
    console.error('❌ Missing TENANT_ID or DB_SCHEMA in .env');
    process.exit(1);
  }

  try {
    console.log(`\n⏳ Provisioning tenant: ${tenantName} (${tenantId})...`);

    // 1. Create public schema if not exists
    await knex.raw('CREATE SCHEMA IF NOT EXISTS public;');

    // 2. Create tenants table in public schema
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        schema_name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Register tenant in public schema
    await knex.raw(`
      INSERT INTO public.tenants (id, name, slug, schema_name)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING;
    `, [tenantId, tenantName, tenantSlug, schemaName]);
    console.log('✅ Registered tenant in public registry.');

    // 4. Create tenant schema
    await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
    console.log(`✅ Schema ${schemaName} created/verified.`);

    // 5. Set search_path to the new schema and run migrations
    console.log('⏳ Running migrations...');
    await knex.schema.withSchema(schemaName).raw(`SET search_path TO ${schemaName}, public;`);

    // Override migration configuration to specify the schema explicitly
    const tenantKnex = require('knex')({
        ...knexConfig[environment],
        searchPath: [schemaName, 'public'],
    });

    await tenantKnex.migrate.latest();
    console.log('✅ Migrations completed successfully.');

    // 6. Run seeds
    console.log('⏳ Running seeds...');
    await tenantKnex.seed.run();
    console.log('✅ Seeds completed successfully.');

    console.log(`\n🎉 Setup complete for tenant: ${tenantName}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error provisioning tenant:', error);
    process.exit(1);
  }
}

setupTenant();
