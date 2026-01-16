import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function processFiles(dir, pattern, replacer) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (file.endsWith('.js')) {
      const filePath = path.join(dir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(pattern, replacer);
      fs.writeFileSync(filePath, content, 'utf8');
    }
  });
}

const action = process.argv[2];
const srcDir = path.join(__dirname, 'gas', 'src');

if (action === 'prepare') {
  processFiles(srcDir, /^export/gm, '#export');
  console.log('Prepared for GAS push');
} else if (action === 'restore') {
  processFiles(srcDir, /^#export/gm, 'export');
  console.log('Restored for local development');
} else {
  console.log('Usage: node prepare-gas.js prepare|restore');
}