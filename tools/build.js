/* ============================================================
   tools/build.js — preflight + itch.io package

     node tools/build.js          verify only
     node tools/build.js --zip    verify, then write dist/sporecrawl.zip

   Preflight fails loudly rather than letting a broken build ship:
     · every JS file parses
     · every asset referenced by index.html exists
     · every script carries the same ?v= cache token
     · the service worker cache name matches that token
     · no leftover debug logging
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const R = p => path.join(ROOT, p);
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');

let failures = 0, warnings = 0;
const fail = m => { console.error('  FAIL  ' + m); failures++; };
const warn = m => { console.warn('  warn  ' + m); warnings++; };
const ok = m => console.log('  ok    ' + m);

const html = fs.readFileSync(R('index.html'), 'utf8');

/* ---------- 1 · every js file parses ---------- */
console.log('\nsyntax');
const jsFiles = fs.readdirSync(R('js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f);
for (const f of jsFiles.concat(['sw.js'])) {
  try {
    execFileSync(process.execPath, ['--check', R(f)], { stdio: 'pipe' });
  } catch (e) {
    fail(f + ' does not parse\n' + (e.stderr || '').toString().split('\n').slice(0, 3).join('\n'));
  }
}
if (!failures) ok(jsFiles.length + 1 + ' javascript files parse');

/* ---------- 2 · referenced assets exist ---------- */
console.log('\nreferences');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(m => m[1])
  .filter(u => !/^(data:|https?:|#|mailto:)/.test(u));
const missing = [];
for (const u of refs) {
  const clean = u.split('?')[0].replace(/^\.\//, '');
  if (!fs.existsSync(R(clean))) missing.push(u);
}
// meta images use content= rather than src/href, and manifest icons live in json
const metaImgs = [...html.matchAll(/(?:og:image|twitter:image)"\s+content="([^"]+)"/g)].map(m => m[1]);
let manifestIcons = [];
try {
  manifestIcons = (JSON.parse(fs.readFileSync(R('manifest.json'), 'utf8')).icons || []).map(i => i.src);
} catch (e) { fail('manifest.json is not valid JSON'); }
for (const u of metaImgs.concat(manifestIcons)) {
  if (/^https?:/.test(u)) continue;
  if (!fs.existsSync(R(u.replace(/^\.\//, '')))) missing.push(u);
}
missing.length ? missing.forEach(m => fail('missing referenced file: ' + m))
  : ok(refs.length + metaImgs.length + manifestIcons.length + ' referenced files all present');

/* ---------- 3 · cache token is consistent ---------- */
console.log('\ncache busting');
const tokens = [...new Set([...html.matchAll(/\?v=([\w.]+)/g)].map(m => m[1]))];
if (tokens.length === 0) fail('no ?v= cache token on any asset — returning players will get stale files');
else if (tokens.length > 1) fail('mixed cache tokens in index.html: ' + tokens.join(', '));
else ok('all assets tagged ?v=' + tokens[0]);

const swSrc = fs.readFileSync(R('sw.js'), 'utf8');
const swCache = (swSrc.match(/CACHE\s*=\s*'([^']+)'/) || [])[1];
if (tokens.length === 1 && swCache && !swCache.endsWith('v' + tokens[0])) {
  fail('service worker cache "' + swCache + '" does not match asset token v' + tokens[0] +
    ' — bump CACHE in sw.js or returning players keep the old build');
} else if (swCache) ok('service worker cache is ' + swCache);

/* ---------- 4 · no debug leftovers ---------- */
console.log('\nhygiene');
let noisy = 0;
for (const f of jsFiles) {
  const src = fs.readFileSync(R(f), 'utf8');
  src.split('\n').forEach((line, i) => {
    if (/console\.(log|debug|info)\s*\(/.test(line) && !/^\s*(\/\/|\*)/.test(line)) {
      warn(f + ':' + (i + 1) + ' leftover console output');
      noisy++;
    }
  });
}
if (!noisy) ok('no stray console logging');

/* ---------- 5 · itch.io requirements ---------- */
console.log('\nitch.io');
fs.existsSync(R('index.html')) ? ok('index.html at archive root') : fail('index.html must be at the archive root');
if (!/viewport/.test(html)) fail('missing viewport meta — the game will not scale on mobile');
else ok('viewport meta present');
if (/<script[^>]+src="https?:/.test(html) || /<link[^>]+href="https?:/.test(html)) {
  fail('external network dependency found — itch builds must be fully self-contained');
} else ok('no external network dependencies');

/* ---------- 6 · size ---------- */
console.log('\nsize');
const SHIP = ['index.html', 'manifest.json', 'sw.js', 'icon.svg', 'icon-maskable.svg', 'css', 'js'];
let bytes = 0, files = [];
const walk = p => {
  const st = fs.statSync(p);
  if (st.isDirectory()) fs.readdirSync(p).forEach(f => walk(path.join(p, f)));
  else { bytes += st.size; files.push(p); }
};
SHIP.forEach(p => { const full = R(p); if (fs.existsSync(full)) walk(full); });
ok(files.length + ' files, ' + (bytes / 1024).toFixed(0) + ' KB uncompressed');

/* ---------- verdict ---------- */
console.log('\n' + '-'.repeat(46));
if (failures) {
  console.error(failures + ' failure(s)' + (warnings ? ', ' + warnings + ' warning(s)' : '') + ' — not shippable');
  process.exit(1);
}
console.log('preflight passed' + (warnings ? ' with ' + warnings + ' warning(s)' : '') + '\n');

/* ---------- package ---------- */
if (process.argv.includes('--zip')) {
  const dist = R('dist');
  fs.mkdirSync(dist, { recursive: true });
  const out = path.join(dist, 'sporecrawl.zip');
  if (fs.existsSync(out)) fs.unlinkSync(out);
  // Compress-Archive keeps index.html at the archive root, which itch requires
  const list = SHIP.filter(p => fs.existsSync(R(p))).map(p => "'" + R(p) + "'").join(',');
  try {
    execFileSync('powershell', ['-NoProfile', '-Command',
      `Compress-Archive -Path ${list} -DestinationPath '${out}' -Force`], { stdio: 'pipe' });
    const kb = (fs.statSync(out).size / 1024).toFixed(0);
    console.log('packaged  dist/sporecrawl.zip  (' + kb + ' KB)');
    console.log('upload that file to itch.io and tick "This file will be played in the browser".\n');
  } catch (e) {
    console.error('zip failed:', (e.stderr || e.message).toString().slice(0, 400));
    process.exit(1);
  }
}
