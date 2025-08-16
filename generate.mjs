import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, 'data', 'very_little_text_expanded.json');
const templatePath = path.join(__dirname, 'template.html');
const episodeTemplatePath = path.join(__dirname, 'episode.html');
const outDir = path.join(__dirname, 'docs');
const episodesDir = path.join(outDir, 'episodes');

function escapeHtml(str=''){return str.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));}

async function build(){
  const raw = JSON.parse(await fs.readFile(dataPath,'utf8'));
  const site = raw.site;
  let stories = raw.stories.map((s,i)=>({...s,index:i}));
  const today = new Date().toISOString().slice(0,10);
  stories.forEach(s=>{if(!s.date) s.date = today;});
  stories.sort((a,b)=>a.date===b.date? a.index-b.index : b.date.localeCompare(a.date));
  if(process.env.STORY_LIMIT){stories = stories.slice(0, Number(process.env.STORY_LIMIT));}

  await fs.rm(outDir,{recursive:true, force:true});
  await fs.mkdir(episodesDir,{recursive:true});
  await fs.copyFile(path.join(__dirname,'style.css'), path.join(outDir,'style.css'));
  for (const asset of ['favicon_32x32.png','favicon_16x16.png','og_image_1200x630.png','twitter_card_800x418.png','preview_1024x512.png']) {
    const src = path.join(__dirname, asset);
    try {
      await fs.copyFile(src, path.join(outDir, asset));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  await fs.copyFile(path.join(__dirname,'CNAME'), path.join(outDir,'CNAME'));
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
  const microLines = latest.micro.map((line,i)=>{
    const microSlug = `${latest.slug}-${i+1}`;
    const target = `/episodes/${latest.date}/#${microSlug}`;
    const shareUrl = encodeURIComponent(`${site.baseUrl}${target}`);
    return `<div class="microline"><span class="microtext">${escapeHtml(line)}</span><span class="actions"><a class="btn" href="${target}">Open</a><a class="btn" href="https://twitter.com/intent/tweet?url=${shareUrl}" rel="nofollow">Share</a></span></div>`;
  }).join('\n        ');

  const indexDesc = escapeHtml(latest.body.slice(0,160));
  const indexJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.baseUrl}/#website`,
    name: site.name,
    url: site.baseUrl,
    description: site.tagline,
    inLanguage: 'en',
    genre: 'AI Microfiction',
    keywords: 'ai, microfiction, short stories'
  };
  const indexHtml = template
    .replace(/{{TITLE}}/g, escapeHtml(`${site.name} — ${latest.title}`))
    .replace(/{{SITE_NAME}}/g, escapeHtml(site.name))
    .replace(/{{TAGLINE}}/g, escapeHtml(site.tagline))
    .replace(/{{STORY_TITLE}}/g, escapeHtml(latest.title))
    .replace(/{{DATE_ISO}}/g, latest.date)
    .replace(/{{STORY_BODY}}/g, escapeHtml(latest.body))
    .replace(/{{MICRO_LINES}}/g, microLines)
    .replace(/{{CANONICAL}}/g, `${site.baseUrl}/`)
    .replace(/{{DESCRIPTION}}/g, indexDesc)
    .replace(/{{JSONLD}}/g, JSON.stringify(indexJsonLd))
    .replace(/{{PLAUSIBLE}}/g, plausibleTag);
  await fs.writeFile(path.join(outDir,'index.html'), indexHtml);

  // episodes
  for(const story of stories){
    const canonical = `${site.baseUrl}/episodes/${story.date}/`;
    const microLinesEp = story.micro.map((line,j)=>{
      const microSlug = `${story.slug}-${j+1}`;
      const target = `#${microSlug}`;
      const shareUrl = encodeURIComponent(`${site.baseUrl}/episodes/${story.date}/${target}`);
      return `<div id="${microSlug}" class="microline"><span class="microtext">${escapeHtml(line)}</span><span class="actions"><a class="btn" href="${target}">Open</a><a class="btn" href="https://twitter.com/intent/tweet?url=${shareUrl}" rel="nofollow">Share</a></span></div>`;
    }).join('\n        ');
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ShortStory',
      '@id': canonical,
      headline: story.title,
      datePublished: story.date,
      url: canonical,
      author: { '@type': 'Organization', name: site.name },
      publisher: { '@type': 'Organization', name: site.name },
      mainEntityOfPage: canonical,
      articleBody: story.body,
      wordCount: story.body.split(/\s+/).length,
      inLanguage: 'en',
      genre: 'AI Microfiction',
      keywords: 'ai, microfiction, short story'
    };
    const desc = escapeHtml(story.body.slice(0,160));
    const epHtml = episodeTemplate
      .replace(/{{STORY_TITLE}}/g, escapeHtml(story.title))
      .replace(/{{SITE_NAME}}/g, escapeHtml(site.name))
      .replace(/{{DATE_ISO}}/g, story.date)
      .replace(/{{STORY_BODY}}/g, escapeHtml(story.body))
      .replace(/{{MICRO_LINES}}/g, microLinesEp)
      .replace(/{{CANONICAL}}/g, canonical)
      .replace(/{{DESCRIPTION}}/g, desc)
      .replace(/{{JSONLD}}/g, JSON.stringify(jsonLd))
      .replace(/{{PLAUSIBLE}}/g, plausibleTag);
    const dir = path.join(episodesDir, story.date);
    await fs.mkdir(dir,{recursive:true});
    await fs.writeFile(path.join(dir,'index.html'), epHtml);
  }

  // sitemap and feed are generated by dedicated scripts
}

build().catch(e=>{console.error(e);process.exit(1);});
