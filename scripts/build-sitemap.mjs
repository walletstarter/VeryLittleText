import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const data = JSON.parse(await fs.readFile(path.join(root, 'data', 'stories.json'), 'utf8'));
const base = data.site.baseUrl.replace(/\/+$/, '');
let stories = Array.isArray(data.stories) ? data.stories.slice() : [];
stories.sort((a,b)=>b.date.localeCompare(a.date));

const today = new Date().toISOString().slice(0,10);
const entries = [];
entries.push({loc: `${base}/`, lastmod: today, changefreq: 'daily', priority: '0.9'});
const latest = stories[0]?.date || today;
entries.push({loc: `${base}/episodes/`, lastmod: latest, changefreq: 'weekly', priority: '0.6'});
for (const s of stories) {
  entries.push({loc: `${base}/episodes/${s.date}/`, lastmod: s.date, changefreq: 'weekly', priority: '0.7'});
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(e=>makeUrl(e)).join('\n')}\n</urlset>`;
await fs.mkdir(path.join(root, 'docs'), {recursive:true});
await fs.writeFile(path.join(root, 'docs', 'sitemap.xml'), xml);

function makeUrl({loc,lastmod,changefreq,priority}) {
  return `  <url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

function escapeXml(str) {
  return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;'}[c]));
}

