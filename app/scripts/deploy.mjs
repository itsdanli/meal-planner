import { execFileSync } from 'node:child_process';
import { mkdtempSync, cpSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(app, '..');
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });
const read = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const remote = read(['remote', 'get-url', 'origin']);
if (remote !== 'https://github.com/itsdanli/meal-planner.git') throw new Error('Unexpected deployment repository.');
run('npm', ['test'], app);
run('npm', ['run', 'build', '--', '--base=/meal-planner/'], app);
const legacy = join(app, 'dist/legacy');
mkdirSync(legacy, { recursive: true });
for (const name of ['index.html', 'recipes.json', 'cocktails.json', 'smoothies.json', 'smoker-recipes.json', 'prefs.json', 'current-week.json']) {
  cpSync(join(root, name), join(legacy, name));
}
writeFileSync(join(app, 'dist/.nojekyll'), '');
const source = read(['rev-parse', 'HEAD']);
writeFileSync(join(app, 'dist/version.json'), JSON.stringify({ source, builtAt: new Date().toISOString() }) + '\n');
const checkout = mkdtempSync(join(tmpdir(), 'weeknight-pages-'));
run('git', ['init', '-b', 'gh-pages'], checkout);
run('git', ['remote', 'add', 'origin', remote], checkout);
if (read(['ls-remote', '--heads', 'origin', 'gh-pages'])) {
  run('git', ['fetch', 'origin', 'gh-pages'], checkout);
  run('git', ['checkout', '-B', 'gh-pages', 'FETCH_HEAD'], checkout);
}
for (const name of readdirSync(checkout)) {
  if (name !== '.git') rmSync(join(checkout, name), { recursive: true, force: true });
}
cpSync(join(app, 'dist'), checkout, { recursive: true });
for (const key of ['user.name', 'user.email']) run('git', ['config', key, read(['config', key])], checkout);
run('git', ['add', '--all'], checkout);
run('git', ['commit', '-m', `Deploy Weeknight from ${source.slice(0, 8)}`], checkout);
// A regular push fails on concurrent changes; never overwrite branch history.
run('git', ['push', 'origin', 'gh-pages'], checkout);
console.log('Published build branch. Check GitHub Pages deployment before announcing it live.');
