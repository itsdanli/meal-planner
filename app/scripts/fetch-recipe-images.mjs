// Finds a freely licensed Wikimedia Commons photo for each recipe and saves it with its credit.
// Usage (from app/): node scripts/fetch-recipe-images.mjs [--candidates out.json] [--ids id1,id2] [--selected-only]
// The manifest at ../recipe-images.json may set "query" (search words) or "commonsTitle" (an exact
// "File:..." page) per recipe id before running. Recipes that already have a downloaded file are skipped.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(app, '..');
const manifestPath = join(root, 'recipe-images.json');
const imageDir = join(app, 'public/recipe-images');
const api = 'https://commons.wikimedia.org/w/api.php';
const headers = { 'User-Agent': 'wmp-meal-planner/0.1 (https://github.com/itsdanli/meal-planner)' };
const allowed = /^(cc0|public domain|pd|cc by(-sa)? [1-4]\.\d)/i;
const strip = html => String(html ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const sleep = ms => new Promise(done => setTimeout(done, ms));

async function query(params) {
  const url = `${api}?${new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '500', ...params })}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Commons request failed: ${response.status}`);
  const pages = Object.values((await response.json()).query?.pages ?? {});
  return pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map(page => {
    const info = page.imageinfo?.[0];
    const meta = info?.extmetadata ?? {};
    return info && {
      commonsTitle: page.title, thumb: info.thumburl, mime: info.mime, width: info.width, height: info.height,
      author: strip(meta.Artist?.value) || 'Unknown', license: strip(meta.LicenseShortName?.value),
      licenseUrl: meta.LicenseUrl?.value ?? null, sourceUrl: info.descriptionurl,
    };
  }).filter(Boolean);
}
const usable = c => c.mime === 'image/jpeg' && c.width >= 800 && c.width >= c.height && allowed.test(c.license);
const search = words => query({ generator: 'search', gsrsearch: `${words} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '20' }).then(found => found.filter(usable));

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const recipes = ['recipes.json', 'daytime-recipes.json', 'daytime-recipe-expansion.json', 'cocktails.json', 'smoker-recipes.json', 'smoothies.json']
  .filter(file => existsSync(join(root, file)))
  .flatMap(file => JSON.parse(readFileSync(join(root, file), 'utf8')));
const candidatesOut = process.argv.includes('--candidates') ? process.argv[process.argv.indexOf('--candidates') + 1] : null;
const onlyIds = process.argv.includes('--ids') ? new Set(process.argv[process.argv.indexOf('--ids') + 1].split(',')) : null;
const candidates = {};
const missing = [];
mkdirSync(imageDir, { recursive: true });

for (const recipe of recipes) {
  if (onlyIds && !onlyIds.has(recipe.id)) continue;
  const entry = manifest[recipe.id] ?? {};
  if (!candidatesOut && entry.file && existsSync(join(imageDir, entry.file))) continue;
  if (process.argv.includes('--selected-only') && !entry.commonsTitle) continue;
  try {
    if (candidatesOut) {
      candidates[recipe.id] = { name: recipe.name, options: (await search(entry.query ?? recipe.name)).slice(0, 6) };
    } else {
      const [pick] = entry.commonsTitle ? await query({ titles: entry.commonsTitle }) : await search(entry.query ?? recipe.name);
      if (!pick || !usable(pick)) { console.warn(`No image found for ${recipe.name}`); missing.push(recipe.id); continue; }
      const image = await fetch(pick.thumb, { headers });
      if (!image.ok) throw new Error(`download failed: ${image.status}`);
      writeFileSync(join(imageDir, `${recipe.id}.jpg`), Buffer.from(await image.arrayBuffer()));
      const { thumb, mime, width, height, ...credit } = pick;
      manifest[recipe.id] = { ...(entry.query ? { query: entry.query } : {}), file: `${recipe.id}.jpg`, ...credit };
      console.log(`${recipe.name}: ${pick.commonsTitle}`);
    }
  } catch (error) { console.warn(`${recipe.name}: ${error.message}`); missing.push(recipe.id); }
  await sleep(300);
}
if (candidatesOut) writeFileSync(candidatesOut, JSON.stringify(candidates, null, 2));
else writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

if (missing.length) {
  console.error(`Images still needed for: ${missing.join(', ')}`);
  process.exitCode = 1;
}
