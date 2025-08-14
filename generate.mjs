import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteUrl = 'https://example.com';
const dataPath = path.join(__dirname, 'data', 'stories.json');
const templatePath = path.join(__dirname, 'template.html');
const episodeTemplatePath = path.join(__dirname, 'episode.html');
const styleSrc = path.join(__dirname, 'style.css');
const staticFiles = ['robots.txt', '_headers', '_redirects'];
const distDir = path.join(__dirname, 'dist');
const episodesDir = path.join(distDir, 'episodes');

async function build() {
  const stories = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  stories.sort((a,b)=>a.slug.localeCompare(b.slug));
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(episodesDir, { recursive: true });
  await fs.copyFile(styleSrc, path.join(distDir, 'style.css'));
  for (const file of staticFiles) {
    try { await fs.copyFile(path.join(__dirname, file), path.join(distDir, file)); } catch {}
  }
  const episodeTpl = await fs.readFile(episodeTemplatePath, 'utf8');
  const microRows = [];
  for (const story of stories) {
    const bodyHtml = story.body.split('\n').map(p=>`<p>${p}</p>`).join('\n    ');
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": story.title,
      "datePublished": story.slug,
      "author": {"@type":"Organization","name":"Little Words"},
      "mainEntityOfPage": `${siteUrl}/episodes/${story.slug}.html`,
      "partOfSeries": {"@type":"CreativeWorkSeries","name":"Little Words"},
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {"@type":"ListItem","position":1,"name":"Home","item": siteUrl},
          {"@type":"ListItem","position":2,"name": story.title,"item": `${siteUrl}/episodes/${story.slug}.html`}
        ]
      }
    };
    const episodeHtml = episodeTpl
      .replace(/{{TITLE}}/g, story.title)
      .replace(/{{BODY}}/g, bodyHtml)
      .replace(/{{DATE}}/g, story.slug)
      .replace(/{{CANONICAL}}/g, `${siteUrl}/episodes/${story.slug}.html`)
      .replace(/{{JSONLD}}/g, JSON.stringify(jsonLd, null, 2));
    await fs.writeFile(path.join(episodesDir, `${story.slug}.html`), episodeHtml, 'utf8');
  }
  const latest = stories[stories.length-1];
  latest.micro.forEach(line => {
    microRows.push(`<div class=\"micro-row\"><a class=\"micro-text\" href=\"episodes/${latest.slug}.html\">${line}</a><span class=\"micro-actions\"><a href=\"episodes/${latest.slug}.html\">Open</a> <a href=\"https://twitter.com/intent/tweet?url=${encodeURIComponent(siteUrl+'/episodes/'+latest.slug+'.html')}\">Share</a> <a href=\"episodes/${latest.slug}.html#save\">Save</a></span></div>`);
  });
  const indexTpl = await fs.readFile(templatePath, 'utf8');
  const indexJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Little Words",
    "url": siteUrl,
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {"@type":"ListItem","position":1,"name":"Home","item": siteUrl}
      ]
    },
    "about": {"@type":"CreativeWorkSeries","name":"Little Words"}
  };
  const indexHtml = indexTpl
    .replace(/{{MICRO_ROWS}}/g, microRows.join('\n    '))
    .replace(/{{JSONLD}}/g, JSON.stringify(indexJsonLd, null, 2));
  await fs.writeFile(path.join(distDir, 'index.html'), indexHtml, 'utf8');

  const urls = [
    { loc: `${siteUrl}/`, lastmod: latest.slug },
    ...stories.map(s => ({ loc: `${siteUrl}/episodes/${s.slug}.html`, lastmod: s.slug }))
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>`;
  await fs.writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');

  const items = stories.map(s => `<item><title>${s.title}</title><link>${siteUrl}/episodes/${s.slug}.html</link><guid>${siteUrl}/episodes/${s.slug}.html</guid><pubDate>${new Date(s.slug).toUTCString()}</pubDate><description>${s.body}</description></item>`).join('\n');
  const feed = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rss version=\"2.0\">\n<channel><title>Little Words</title><link>${siteUrl}</link><description>Serialized micro fiction</description>${items}</channel>\n</rss>`;
  await fs.writeFile(path.join(distDir, 'feed.xml'), feed, 'utf8');
}

build();
