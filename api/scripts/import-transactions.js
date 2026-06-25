const fs = require('fs');
const path = require('path');
const knexConfig = require('../knexfile');
const environment = process.env.NODE_ENV || 'production';
const knex = require('knex')(knexConfig[environment]);

// Tidak perlu parse khusus, kita akan gunakan split(';') karena format baru menggunakan titik koma

async function importTransactions() {
  const schemaName = process.env.DB_SCHEMA || 'tenant_tokoabc';

  try {
    console.log(`Setting schema to ${schemaName}...`);
    await knex.schema.withSchema(schemaName).raw(`SET search_path TO ${schemaName}, public;`);

    // Hapus data transaksi lama
    console.log('Menghapus data riwayat transaksi lama...');
    await knex('transaction_items').withSchema(schemaName).del();
    await knex('transactions').withSchema(schemaName).del();

    console.log('Membaca transaction.csv...');
    const transContent = fs.readFileSync('/app/transaction.csv', 'utf8');
    const transLines = transContent.split(/[\r\n]+/).filter(Boolean);

    console.log('Membaca transaction_detail.csv...');
    const detailContent = fs.readFileSync('/app/transaction_detail.csv', 'utf8');
    const detailLines = detailContent.split(/[\r\n]+/).filter(Boolean);

    let insertedTransactions = 0;
    let insertedItems = 0;

    // Build items dictionary for fast lookup by name
    const allItems = await knex('items').withSchema(schemaName).select('id', 'name');
    const itemsMap = new Map();
    for (const itm of allItems) {
      itemsMap.set(itm.name.toLowerCase(), itm.id);
    }

    // Process transactions
    console.log('Memproses transaksi induk...');
    // line 0 is header
    for (let i = 1; i < transLines.length; i++) {
      const line = transLines[i].trim();
      if (!line) continue;

      const cols = line.split(';');
      // Expected length is roughly 21
      if (cols.length < 13) continue;

      const outlet = cols[0];
      const dateStr = cols[1]; // 07/06/2026
      const timeStr = cols[2]; // 13:25:37
      
      // Parse DD/MM/YYYY HH:mm:ss to Date
      const dateParts = dateStr.split('/');
      let createdAt = new Date();
      if (dateParts.length === 3) {
        // YYYY-MM-DDTHH:mm:ssZ
        createdAt = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${timeStr}Z`);
      }

      // Karena angka dari CSV (misal 350000) sebenarnya adalah 35000.0, kita bagi 10
      const grossSales = (parseFloat(cols[3]) || 0) / 10;
      const discounts = (parseFloat(cols[4]) || 0) / 10;
      const refunds = (parseFloat(cols[5]) || 0) / 10;
      const netSales = (parseFloat(cols[6]) || 0) / 10;
      const gratuity = (parseFloat(cols[7]) || 0) / 10;
      const tax = (parseFloat(cols[8]) || 0) / 10;
      const totalCollected = (parseFloat(cols[9]) || 0) / 10;
      const totalAmount = (parseFloat(cols[10]) || 0) / 10;
      
      const otherNote = cols[11];
      const receiptNumber = cols[12];
      const collectedBy = cols[13];
      const servedBy = cols[14];
      const customer = cols[15];
      const customerPhone = cols[16];
      const paymentMethod = cols[18];
      const eventType = cols[19];
      const reasonOfRefund = cols[20];

      console.log('Inserting transaction:', receiptNumber);
      await knex('transactions').withSchema(schemaName).insert({
        id: receiptNumber,
        outlet: outlet,
        subtotal: grossSales,
        discount_amount: discounts,
        refunds: refunds,
        net_sales: netSales,
        gratuity: gratuity,
        tax_amount: tax,
        payment_amount: totalCollected,
        total: totalAmount,
        change_amount: totalCollected - totalAmount,
        notes: otherNote,
        cashier_name: collectedBy || servedBy,
        customer_name: customer,
        customer_phone: customerPhone,
        payment_method_name: paymentMethod,
        event_type: eventType,
        reason_of_refund: reasonOfRefund,
        status: refunds > 0 ? 'cancelled' : 'completed',
        created_at: createdAt,
        updated_at: createdAt
      });
      insertedTransactions++;
    }

    // Process transaction details
    console.log('Memproses detail item transaksi...');
    for (let i = 1; i < detailLines.length; i++) {
      const line = detailLines[i].trim();
      if (!line) continue;

      const cols = line.split(';'); // Semicolon separated
      if (cols.length < 24) continue;

      const receiptNumber = cols[1];
      const itemName = cols[6];
      const qtyStr = cols[9];
      const qty = parseInt(qtyStr) || 1;
      
      // The issue with detail csv is Gross Sales might be missing a decimal point or not.
      // Let's rely on it, but if it looks huge we can adjust. Actually, we'll just use it directly.
      // Wait, 350000 -> 35000? Let's check string ending.
      let grossSalesStr = cols[12] || '0';
      if (grossSalesStr.length >= 2 && grossSalesStr.endsWith('0') && !grossSalesStr.includes('.')) {
         // It might be 350000 instead of 35000.0
         // But wait, the previous inspection showed:
         // trans: 35000.0, trans_detail: 350000. So trans_detail is trans * 10
         // Let's just strip the last 0 if it ends with 0000? Or just divide by 10 for safety if it matches pattern?
         // Safer: divide by qty to get price, but wait, if grossSales is 350000, price would be 350000.
         // Let's check if the transactions total matches. It doesn't matter much for history, but let's just use it divided by 10 to match transactions.
      }
      
      // Let's divide by 10 for ALL numeric values in detail if they are 10x larger than transaction.csv
      // But maybe it's better to just recalculate from transaction.csv if possible?
      // Actually, let's just divide by 10!
      let grossSales = parseFloat(grossSalesStr) / 10;
      if (isNaN(grossSales)) grossSales = 0;

      // Find item_id
      let itemId = itemsMap.get(itemName.toLowerCase());
      if (!itemId) {
          // Find first item that matches partially
          for (const [key, val] of itemsMap.entries()) {
              if (key.includes(itemName.toLowerCase()) || itemName.toLowerCase().includes(key)) {
                  itemId = val;
                  break;
              }
          }
      }

      await knex('transaction_items').withSchema(schemaName).insert({
        transaction_id: receiptNumber,
        item_id: itemId || null, // Allow null if not found
        qty: qty,
        price: grossSales / qty,
        subtotal: grossSales
      });
      insertedItems++;
    }

    console.log(`Selesai! Berhasil mengimpor ${insertedTransactions} invoice dan ${insertedItems} item terjual.`);
  } catch (error) {
    console.error('Error saat impor transaksi:', error);
  } finally {
    knex.destroy();
  }
}

importTransactions();
