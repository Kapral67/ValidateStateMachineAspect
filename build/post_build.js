const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'dist');
const regex = /(?<=require\(")(?:..\/)+(?=node_modules)/g;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(regex, match => '../' + match);
  fs.writeFileSync(filePath, content, 'utf8');
}

function recurseDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      recurseDir(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

recurseDir(baseDir);
