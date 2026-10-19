// Syntax check for generated TSX files with esbuild. usage: node scripts/checkgen.mjs file1.tsx file2.tsx ...
import {transformSync} from 'esbuild';
import fs from 'fs';
const out = {};
for (const f of process.argv.slice(2)) {
  try { transformSync(fs.readFileSync(f, 'utf8'), {loader: 'tsx', jsx: 'automatic'}); out[f] = null; }
  catch (e) { out[f] = String(e.message || e).slice(0, 600); }
}
process.stdout.write(JSON.stringify(out));
