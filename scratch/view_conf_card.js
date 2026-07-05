import fs from 'fs';

const content = fs.readFileSync('c:/Users/AHMAD/Desktop/Karam/frontend/src/components/LocalAI.jsx', 'utf8');
const lines = content.split('\n');

let start = -1;
let end = -1;

lines.forEach((line, idx) => {
  if (line.includes('const renderConfirmationCard')) {
    start = idx;
  }
  if (start !== -1 && end === -1 && idx > start && line.trim() === '};') {
    end = idx;
  }
});

if (start !== -1) {
  console.log(`Found from line ${start + 1} to ${end + 1}:`);
  console.log(lines.slice(start, end + 1).join('\n'));
} else {
  console.log('Not found');
}
