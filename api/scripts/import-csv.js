const fs = require('fs');
const path = require('path');
const knexConfig = require('../knexfile');
const environment = process.env.NODE_ENV || 'production'; // Using production inside container
const knex = require('knex')(knexConfig[environment]);

async function importCSV() {
  const schemaName = process.env.DB_SCHEMA || 'tenant_tokoabc';

  try {
    console.log(`Setting schema to ${schemaName}...`);
    // Connect to specific tenant schema
    await knex.schema.withSchema(schemaName).raw(`SET search_path TO ${schemaName}, public;`);

    console.log('Menghapus data lama...');
    // Kita harus menghapus data transaksi terlebih dahulu karena item dirujuk oleh transaction_items
    await knex('transaction_items').withSchema(schemaName).del();
    await knex('transactions').withSchema(schemaName).del();
    await knex('stock_adjustments').withSchema(schemaName).del();
    await knex('items').withSchema(schemaName).del();
    await knex('categories').withSchema(schemaName).del();

    console.log('Membaca file CSV...');
    const csvPath = path.join('/app', '..', 'item.csv'); // /app/../item.csv => /item.csv, wait actually we will mount it or pass it. 
    // Wait, the csv is in the host root directory `d:\AntiGravity\pos\item.csv`.
    // In docker-compose, `pos` root is mounted as `./api:/app` and frontend as `./frontend:/app`. 
    // Wait! `item.csv` is NOT mounted inside the container. 
    // So `fs.readFileSync` won't find it inside the container unless I copy it!
    // I'll make the script read from `/app/item.csv` and I will `docker cp` it before running.

    const fileContent = fs.readFileSync('/app/item.csv', 'utf8');
    const lines = fileContent.split('\n');

    const categoriesMap = new Map();
    let importedItems = 0;

    console.log('Memulai proses impor...');

    // Skip header (line 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(';');

      const internalId = cols[0];
      const categoryName = cols[1] || 'Uncategorized';
      let sku = cols[2];
      const itemName = cols[3];
      
      // Jika SKU kosong, gunakan internal_id
      if (!sku || sku.trim() === '') {
        sku = internalId;
      }

      // Pastikan SKU valid dan tidak duplikat di baris yang sama. 
      // Knex akan error jika duplikat, tapi kita bisa handle atau abaikan.
      // Dalam dataset kita asumsikan internalId unik, dan sku unik.

      const weight = cols[7];
      const length = cols[8];
      const width = cols[9];
      const height = cols[10];
      const condition = cols[11];
      const brandName = cols[12];
      const variantName = cols[13];
      
      const priceStr = cols[14];
      const price = priceStr ? parseFloat(priceStr) : 0;

      const imageUrl = cols[15];

      const inStockStr = cols[27];
      const inStock = inStockStr ? parseInt(inStockStr) : 0;

      const stockAlertStr = cols[30];
      const minStock = stockAlertStr ? parseInt(stockAlertStr) : 0;

      const hppStr = cols[32];
      const hpp = hppStr ? parseFloat(hppStr) : 0;

      // Handle category mapping
      if (!categoriesMap.has(categoryName)) {
        const [catId] = await knex('categories').withSchema(schemaName).insert({
          name: categoryName
        }).returning('id');
        categoriesMap.set(categoryName, catId.id || catId); // Support postgres returning object
      }

      const categoryId = categoriesMap.get(categoryName);

      // Pastikan data ini valid minimal ada nama dan SKU
      if (sku && itemName) {
        await knex('items').withSchema(schemaName).insert({
          internal_id: internalId,
          code: sku,
          name: itemName,
          category_id: categoryId,
          price: price,
          hpp: hpp,
          stock: inStock,
          min_stock: minStock,
          variant_name: variantName,
          brand_name: brandName,
          condition: condition,
          image_url: imageUrl,
          is_active: true
        });
        importedItems++;
      }
    }

    console.log(`Berhasil mengimpor ${importedItems} item ke dalam database!`);
  } catch (error) {
    console.error('Error saat impor:', error);
  } finally {
    knex.destroy();
  }
}

importCSV();
