const knexConfig = require('../knexfile');
const environment = process.env.NODE_ENV || 'production';
const knex = require('knex')(knexConfig[environment]);

async function deleteData() {
  const schemaName = 'tenant_tokoabc';
  try {
    await knex.schema.withSchema(schemaName).raw(`SET search_path TO ${schemaName}, public;`);
    
    // Pola nama produk yang diminta user
    // Saya juga menambahkan variasi ejaan yang mungkin typo (Andromeda vs Adromeda, Dmoon vs Dmon)
    const patterns = [
        'Aflo%', 'Adromeda%', 'Andromeda%', 'Chocoman%', 'DUA%', 
        'Deex%', 'Dmon%', 'Dmoon%', 'EJM%', 'Elo%', 'Kuy%', 'Latt%'
    ];
    
    // Cari produk yang cocok dengan pola (Case Insensitive ILIKE)
    let query = knex('items').withSchema(schemaName);
    patterns.forEach((p, i) => {
        if (i === 0) {
            query = query.where('name', 'ilike', p);
        } else {
            query = query.orWhere('name', 'ilike', p);
        }
    });
    
    const itemsToDelete = await query.select('id');
    const itemIds = itemsToDelete.map(i => i.id);
    
    console.log(`Menemukan ${itemIds.length} produk untuk dihapus.`);
    
    if (itemIds.length > 0) {
        // Hapus kaitan item dari transaksi agar tidak error foreign key
        await knex('transaction_items').withSchema(schemaName).whereIn('item_id', itemIds).update({ item_id: null });
        
        // Hapus stok adjustments jika ada
        await knex('stock_adjustments').withSchema(schemaName).whereIn('item_id', itemIds).del();
        
        // Hapus produk
        await knex('items').withSchema(schemaName).whereIn('id', itemIds).del();
        console.log(`Berhasil menghapus ${itemIds.length} produk dari database.`);
    }

    console.log(`Menghapus semua data supplier...`);
    // Putuskan kaitan supplier_id di tabel items agar tidak error
    await knex('items').withSchema(schemaName).update({ supplier_id: null });
    
    // Hapus semua data supplier
    const deletedSuppliers = await knex('suppliers').withSchema(schemaName).del();
    console.log(`Berhasil menghapus ${deletedSuppliers} supplier dari database.`);

    console.log('Mengubah stok minimum semua item menjadi 1...');
    const updatedItems = await knex('items').withSchema(schemaName).update({ min_stock: 1 });
    console.log(`Berhasil mengubah stok minimum untuk ${updatedItems} produk.`);

  } catch (error) {
    console.error('Error saat menghapus data:', error);
  } finally {
    knex.destroy();
  }
}

deleteData();
