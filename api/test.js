require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET || 'ganti_dengan_secret_panjang_dan_acak');

async function test() {
  try {
    const res1 = await fetch('http://localhost:3004/api/library/categories', { headers: { Authorization: `Bearer ${token}` } });
    const data1 = await res1.json();
    console.log("Categories:", data1);
  } catch (err) {
    console.error("Categories Error:", err.message);
  }
  
  try {
    const res2 = await fetch('http://localhost:3004/api/library/items', { headers: { Authorization: `Bearer ${token}` } });
    const data2 = await res2.json();
    console.log("Items OK. length:", data2.data ? data2.data.length : 'No data array', data2.error ? data2.error : '');
  } catch (err) {
    console.error("Items Error:", err.message);
  }
}

test();
