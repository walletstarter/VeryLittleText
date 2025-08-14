import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, 'data', 'stories.json');
const templatePath = path.join(__dirname, 'template.html');
const episodeTemplatePath = path.join(__dirname, 'episode.html');
const outDir = path.join(__dirname, 'docs');
const episodesDir = path.join(outDir, 'episodes');

function escapeHtml(str=''){return str.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));}

async function build(){
  const raw = JSON.parse(await fs.readFile(dataPath,'utf8'));
  const site = raw.site;
  let stories = raw.stories.map((s,i)=>({...s, index:i}));
  const today = new Date().toISOString().slice(0,10);
  stories.forEach(s=>{if(!s.date) s.date = today;});
  stories.sort((a,b)=>a.date===b.date? a.index-b.index : b.date.localeCompare(a.date));
  if(process.env.STORY_LIMIT){stories = stories.slice(0, Number(process.env.STORY_LIMIT));}

  await fs.rm(outDir,{recursive:true, force:true});
  await fs.mkdir(episodesDir,{recursive:true});
  await fs.copyFile(path.join(__dirname,'style.css'), path.join(outDir,'style.css'));
  for(const file of ['_headers','_redirects']){
    await fs.copyFile(path.join(__dirname,file), path.join(outDir,file));
  }
  await fs.writeFile(path.join(outDir,'.nojekyll'),'');
  await fs.writeFile(path.join(outDir,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap.xml\n`);

  const template = await fs.readFile(templatePath,'utf8');
  const episodeTemplate = await fs.readFile(episodeTemplatePath,'utf8');

  const plausibleDomain = process.env.PLAUSIBLE_DOMAIN;
  const plausibleTag = plausibleDomain ? `<script defer data-domain="${escapeHtml(plausibleDomain)}" src="https://plausible.io/js/script.js"></script>` : '';

  const latest = stories[0];
  const microRows = latest.micro.map((line,i)=>{
    const share = `${site.baseUrl}/episodes/${latest.date}/`;
    return `<div class="micro-row"><span class="micro-text"><a href="episodes/${latest.date}/#m${i+1}">${escapeHtml(line)}</a></span><div class="actions"><a href="episodes/${latest.date}/#m${i+1}">Open</a> <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(share)}">Share</a> <a href="episodes/${latest.date}/#save">Save</a></div></div>`;
  }).slice(0,6);

  const indexDesc = escapeHtml(latest.body.slice(0,160));
  const indexJsonLd = {
    '@context':'https://schema.org',
    '@type':'WebSite',
    name: site.name,
    url: site.baseUrl,
    description: site.tagline
  };
  const latestBodyHtml = latest.body.split(/\n+/).map((p,i)=>`<p${i<latest.micro.length?` id="m${i+1}"`:''}>${escapeHtml(p)}</p>`).join('\n    ');
  const indexHtml = template
    .replace(/{{SITE_NAME}}/g, escapeHtml(site.name))
    .replace(/{{TAGLINE}}/g, escapeHtml(site.tagline))
    .replace(/{{TITLE}}/g, escapeHtml(latest.title))
    .replace(/{{DATE}}/g, latest.date)
    .replace(/{{BODY}}/g, latestBodyHtml)
    .replace(/{{MICRO_ROWS}}/g, microRows.join('\n    '))
    .replace(/{{CANONICAL}}/g, `${site.baseUrl}/`)
    .replace(/{{DESCRIPTION}}/g, indexDesc)
    .replace(/{{JSONLD}}/g, JSON.stringify(indexJsonLd,null,2))
    .replace(/{{PLAUSIBLE}}/g, plausibleTag);
  await fs.writeFile(path.join(outDir,'index.html'), indexHtml);

  // episodes
  for(let i=0;i<stories.length;i++){
    const story = stories[i];
    const canonical = `${site.baseUrl}/episodes/${story.date}/`;
    const bodyHtml = story.body.split(/\n+/).map((p,j)=>`<p id="m${j+1}">${escapeHtml(p)}</p>`).join('\n    ');
    const jsonLd = {
      '@context':'https://schema.org',
      '@type':'Article',
      headline: story.title,
      datePublished: story.date,
      url: canonical,
      author: {'@type':'Organization', name: site.name}
    };
    const desc = escapeHtml(story.body.slice(0,160));
    const prev = stories[i+1];
    const next = stories[i-1];
    const nav = [`<nav class="episode-nav">`];
    if(prev) nav.push(`<a href="../${prev.date}/">Previous</a>`);
    if(next) nav.push(`<a href="../${next.date}/">Next</a>`);
    nav.push('</nav>');
    const epHtml = episodeTemplate
      .replace(/{{SITE_NAME}}/g, escapeHtml(site.name))
      .replace(/{{TITLE}}/g, escapeHtml(story.title))
      .replace(/{{DATE}}/g, story.date)
      .replace(/{{BODY}}/g, bodyHtml)
      .replace(/{{CANONICAL}}/g, canonical)
      .replace(/{{DESCRIPTION}}/g, desc)
      .replace(/{{JSONLD}}/g, JSON.stringify(jsonLd,null,2))
      .replace(/{{NAV}}/g, nav.join(''))
      .replace(/{{PLAUSIBLE}}/g, plausibleTag);
    const dir = path.join(episodesDir, story.date);
    await fs.mkdir(dir,{recursive:true});
    await fs.writeFile(path.join(dir,'index.html'), epHtml);
  }

  const urls = [
    {loc:`${site.baseUrl}/`, lastmod:latest.date},
    ...stories.map(s=>({loc:`${site.baseUrl}/episodes/${s.date}/`, lastmod:s.date}))
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>`;
  await fs.writeFile(path.join(outDir,'sitemap.xml'), sitemap);

  const feedItems = stories.slice(0,20).map(s=>`<item><title>${escapeHtml(s.title)}</title><link>${site.baseUrl}/episodes/${s.date}/</link><guid>${site.baseUrl}/episodes/${s.date}/</guid><pubDate>${new Date(s.date).toUTCString()}</pubDate><description>${escapeHtml(s.body)}</description></item>`).join('\n');
  const feed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${escapeHtml(site.name)}</title><link>${site.baseUrl}</link><description>${escapeHtml(site.tagline)}</description>${feedItems}</channel></rss>`;
  await fs.writeFile(path.join(outDir,'feed.xml'), feed);
}

build().catch(e=>{console.error(e);process.exit(1);});
