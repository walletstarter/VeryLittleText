import { promises as fs } from 'fs';
import assert from 'assert';

async function exists(p){await fs.access(p);}

async function main(){
  await exists('docs/index.html');
  const eps = await fs.readdir('docs/episodes');
  assert(eps.length > 0,'no episodes');
  for(const ep of eps){
    await exists(`docs/episodes/${ep}/index.html`);
  }
  await exists('docs/sitemap.xml');
  await exists('docs/feed.xml');
  const indexHtml = await fs.readFile('docs/index.html','utf8');
  assert(indexHtml.includes('application/ld+json'),'index json-ld missing');
  assert(indexHtml.includes('id="flood-toggle"'),'flood toggle missing');
  assert(indexHtml.includes('>Open<'),'Open button missing');
  assert(indexHtml.includes('intent/tweet'),'Share link missing');
  const indexJson = JSON.parse(indexHtml.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert(indexJson.inLanguage === 'en', 'index json-ld missing language');
  const epHtml = await fs.readFile(`docs/episodes/${eps[0]}/index.html`,'utf8');
  assert(epHtml.includes('application/ld+json'),'episode json-ld missing');
  const epJson = JSON.parse(epHtml.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert(epJson.inLanguage === 'en', 'episode json-ld missing language');
  console.log('QA checks passed');
}

main();
