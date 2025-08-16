import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const data = JSON.parse(await fs.readFile(path.join(root, 'data', 'very_little_text_expanded.json'), 'utf8'));
const site = data.site;
let stories = Array.isArray(data.stories) ? data.stories.slice() : [];
stories.sort((a,b)=>b.date.localeCompare(a.date));

const items = stories.slice(0,20).map(s=>
  `<item><title>${escapeXml(s.title)}</title><link>${site.baseUrl}/episodes/${s.date}/</link><guid>${site.baseUrl}/episodes/${s.date}/</guid><pubDate>${new Date(s.date).toUTCString()}</pubDate><description>${escapeXml(s.body)}</description></item>`
).join('\n');

const feed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${escapeXml(site.name)}</title><link>${site.baseUrl}</link><description>${escapeXml(site.tagline)}</description>${items}</channel></rss>`;
await fs.mkdir(path.join(root, 'docs'), {recursive:true});
await fs.writeFile(path.join(root, 'docs', 'feed.xml'), feed);

function escapeXml(str){
  return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;'}[c]));
}

