import fs from 'fs';

const content = fs.readFileSync('c:/Users/AHMAD/Desktop/Karam/frontend/src/components/LocalAI.jsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(2520, 2600).join('\n'));
