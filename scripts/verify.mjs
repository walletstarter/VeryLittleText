import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function exists(rel){
  const p = path.join(root, rel);
  if(!fs.existsSync(p)){
    console.error('Missing', rel);
    process.exitCode = 1;
  }
}

function contains(rel, regex){
  const p = path.join(root, rel);
  const txt = fs.readFileSync(p,'utf8');
  if(!regex.test(txt)){
    console.error('Pattern', regex, 'not found in', rel);
    process.exitCode = 1;
  }
}

exists('docs/index.html');
exists('docs/sitemap.xml');
exists('docs/sitemap.txt');

const data = JSON.parse(fs.readFileSync(path.join(root,'data','very_little_text_expanded.json'),'utf8'));
for(const s of data.stories){
  exists(`docs/episodes/${s.date}/index.html`);
}

contains('docs/index.html', /<link rel="canonical"/i);
contains('docs/index.html', /"@type"\s*:\s*"WebSite"/);

for(const s of data.stories){
  const file = `docs/episodes/${s.date}/index.html`;
  contains(file, /<link rel="canonical"/i);
  contains(file, /"@type"\s*:\s*"Article"/);
}

if(process.exitCode) process.exit(1);

