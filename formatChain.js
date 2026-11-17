const fs = require('fs');

// 1. Load your JSON file
const rawData = fs.readFileSync('pokemon.json', 'utf8');
const jsonData = JSON.parse(rawData);
console.log(jsonData);
// Optional: List specific keys to pad (leave empty [] to convert ALL numbers)
const targetKeys = ['evolutionChain']; 

function padNumbers(obj, currentKey = '') {
  if (Array.isArray(obj)) {
    return obj.map(item => padNumbers(item, currentKey));
  } else if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      obj[key] = padNumbers(obj[key], key);
    }
    return obj;
  } else if (typeof obj === 'number') {
    // Check if we should convert all numbers OR only matching keys
    if (targetKeys.length === 0 || targetKeys.includes(currentKey)) {
      return String(obj).padStart(3, '0');
    }
  }
  return obj;
}

const updatedData = padNumbers(jsonData);

// 2. Save to a new file (or overwrite data.json)
fs.writeFileSync('output.json', JSON.stringify(updatedData, null, 2));
console.log('Done! Saved to output.json');
