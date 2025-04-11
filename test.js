const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
const escapedKey = raw.private_key.replace(/\n/g, '\\n');
console.log('✅ COPY THIS TO NETLIFY:\n');
console.log('GOOGLE_CREDENTIALS_PRIVATE_KEY="' + escapedKey + '"');