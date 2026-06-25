const fs = require('fs');

const line = fs.readFileSync('transaction.csv', 'utf8').split('\n')[1].trim();
function parse(row) {
    const cols = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (c === '"') {
            inQuote = !inQuote;
        } else if (c === ',' && !inQuote) {
            cols.push(cur);
            cur = '';
        } else {
            cur += c;
        }
    }
    cols.push(cur);
    return cols;
}

const parsed = parse(line);
console.log('Length:', parsed.length);
console.log('Cols:', parsed);
