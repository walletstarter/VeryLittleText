// scripts/build-sitemap.mjs
// Build sitemap.xml from data/stories.json → docs/sitemap.xml
// Deterministic, no network calls.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const repoRoot   = path.resolve(__dirname, "..");

const dataPath   = path.join(repoRoot, "data", "stories.json");
const outDir     = path.join(repoRoot, "docs");
const outPath    = path.join(outDir, "sitemap.xml");

// ---- load site + stories
if (!fs.existsSync(dataPath)) {
  throw new Error(`Missing ${dataPath}`);
}
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const baseUrl = (data.site?.baseUrl || "").replace(/\/+$/,"");
if (!baseUrl) throw new Error("data.site.baseUrl is required (e.g., https://verylittletext.com)");

let stories = Array.isArray(data.stories) ? data.stories.slice() : [];
// normalize + sort newest→oldest
stories = stories.map(s => ({
  ...s,
  date: s.date || new Date().toISOString().slice(0,10), // default today
  slug: s.slug || slugify(s.title || "episode")
})).sort((a,b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

// ---- url helpers
const urls = new Set();
const add = (loc, changefreq="daily", priority="0.8", lastmodIso=null) => {
  urls.add(xmlUrl({ loc, changefreq, priority, lastmodIso }));
};
const todayIso = new Date().toISOString();

// core pages
add(`${baseUrl}/`, "daily", "0.9", todayIso);
add(`${baseUrl}/episodes/`, "weekly", "0.6", stories[0]?.date ? `${stories[0].date}T00:00:00Z` : todayIso);

// episodes
for (const s of stories) {
  const lastmod = `${s.date}T00:00:00Z`;
  add(`${baseUrl}/episodes/${s.date}/`, "weekly", "0.7", lastmod);
}

// ---- write xml
const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...urls,
  `</urlset>\n`
].join("\n");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, xml, "utf8");
console.log(`wrote ${path.relative(repoRoot, outPath)} (${urls.size} urls)`);

// ---- helpers
function xmlUrl({ loc, changefreq, priority, lastmodIso }) {
  const parts = [
    `  <url>`,
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmodIso ? `    <lastmod>${escapeXml(lastmodIso)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    `  </url>`
  ].filter(Boolean);
  return parts.join("\n");
}
function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, ch => (
    {"<":"&lt;","&":"&amp;",">":"&gt;","'":"&apos;","\"":"&quot;"}[ch]
  ));
}
function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}
