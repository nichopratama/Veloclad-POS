async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/reports/dynamic?tab=payment-methods');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('Failed 3000, trying 3040');
    try {
      const res = await fetch('http://localhost:3040/api/reports/dynamic?tab=payment-methods');
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
    }
  }
}
test();
