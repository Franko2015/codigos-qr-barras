// Prepares the static build for GitHub Pages:
// - 404.html: GitHub Pages serves it for paths without a file (e.g. /guardados), so the app loads and routes there.
// - .nojekyll: publish files as they are, without Jekyll processing.
import { copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join('dist', 'codigos-qr-barras', 'browser');
copyFileSync(join(dir, 'index.csr.html'), join(dir, '404.html'));
writeFileSync(join(dir, '.nojekyll'), '');
console.log(`GitHub Pages: listo en ${dir}`);
