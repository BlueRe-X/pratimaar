const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
const staticPaths = ['index.html', 'css', 'js', 'img', 'asset', 'target'];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const relativePath of staticPaths) {
  fs.cpSync(
    path.join(root, relativePath),
    path.join(output, relativePath),
    { recursive: true }
  );
}

console.log(`Static site built in ${path.relative(root, output)}.`);
