/* node tools/build.js [--zip] */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const zlib = require('zlib');

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

/* ---------- 6 · content vs cache token ---------- */
const SHIP = ['index.html', 'manifest.json', 'sw.js', 'icon.svg', 'icon-maskable.svg', 'css', 'js'];

console.log('\nrelease lock');
const collect = p => {
  const st = fs.statSync(p);
  if (st.isDirectory()) return fs.readdirSync(p).sort().flatMap(f => collect(path.join(p, f)));
  return [p];
};
const shipped = SHIP.filter(p => fs.existsSync(R(p))).flatMap(p => collect(R(p))).sort();
const digest = crypto.createHash('sha256');
for (const f of shipped) {
  digest.update(rel(f));
  digest.update(fs.readFileSync(f, 'utf8').replace(/\?v=[\w.]+/g, ''));
}
const hash = digest.digest('hex').slice(0, 16);
const lockPath = R('tools/release.lock');
let lock = null;
try { lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch (e) { }

if (lock && lock.version === tokens[0] && lock.hash !== hash) {
  fail('files changed but ?v= is still ' + tokens[0] + ' — anyone who has already loaded the ' +
    'game keeps the old build out of the service worker cache. Bump ?v= in index.html and CACHE in sw.js.');
} else if (lock && lock.version === tokens[0]) {
  ok('content matches the recorded ' + tokens[0] + ' release');
} else {
  ok('new release ' + tokens[0] + ' (' + hash + ')');
}

/* ---------- 7 · size ---------- */
console.log('\nsize');
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
const CRC = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();
const crc32 = buf => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

function writeZip(outPath, entries) {
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const locals = [], central = [];
  let offset = 0;

  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const packed = zlib.deflateRawSync(e.data, { level: 9 });
    const store = packed.length >= e.data.length;
    const body = store ? e.data : packed;
    const method = store ? 0 : 8;
    const sum = crc32(e.data);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(method, 8); lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(sum, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(e.data.length, 22);
    lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, body);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10); ch.writeUInt16LE(time, 12);
    ch.writeUInt16LE(date, 14); ch.writeUInt32LE(sum, 16); ch.writeUInt32LE(body.length, 20);
    ch.writeUInt32LE(e.data.length, 24); ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(0, 30); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
    central.push(ch, name);

    offset += lh.length + name.length + body.length;
  }

  const cd = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16); eocd.writeUInt16LE(0, 20);

  fs.writeFileSync(outPath, Buffer.concat([...locals, cd, eocd]));
}

function readZipNames(file) {
  const b = fs.readFileSync(file);
  let p = b.length - 22;
  while (p >= 0 && b.readUInt32LE(p) !== 0x06054b50) p--;
  if (p < 0) return null;
  const count = b.readUInt16LE(p + 10);
  let at = b.readUInt32LE(p + 16), n = 0;
  const names = [];
  while (n < count && b.readUInt32LE(at) === 0x02014b50) {
    const len = b.readUInt16LE(at + 28);
    names.push({
      name: b.slice(at + 46, at + 46 + len).toString('utf8'),
      packed: b.readUInt32LE(at + 20),
      raw: b.readUInt32LE(at + 24)
    });
    at += 46 + len + b.readUInt16LE(at + 30) + b.readUInt16LE(at + 32);
    n++;
  }
  return names;
}

if (process.argv.includes('--zip')) {
  const dist = R('dist');
  fs.mkdirSync(dist, { recursive: true });
  const out = path.join(dist, 'sporecrawl.zip');
  if (fs.existsSync(out)) fs.unlinkSync(out);

  writeZip(out, shipped.map(f => ({ name: rel(f), data: fs.readFileSync(f) })));

  const head = fs.readFileSync(out).slice(0, 4);
  if (head.readUInt32LE(0) !== 0x04034b50) {
    console.error('  FAIL  output is not a ZIP archive (magic ' + head.toString('hex') + ')');
    process.exit(1);
  }
  const listed = readZipNames(out);
  if (!listed) { console.error('  FAIL  no central directory in the archive'); process.exit(1); }

  const backslashed = listed.filter(n => n.name.includes('\\'));
  if (backslashed.length) {
    console.error('  FAIL  archive uses backslash separators: ' + backslashed.slice(0, 3).map(n => n.name).join(', '));
    process.exit(1);
  }
  if (!listed.some(n => n.name === 'index.html')) {
    console.error('  FAIL  index.html is not at the archive root');
    process.exit(1);
  }
  if (listed.length !== shipped.length) {
    console.error('  FAIL  archive holds ' + listed.length + ' of ' + shipped.length + ' files');
    process.exit(1);
  }

  fs.writeFileSync(lockPath, JSON.stringify({ version: tokens[0], hash: hash }, null, 2) + '\n');

  const raw = listed.reduce((a, n) => a + n.raw, 0);
  const packed = listed.reduce((a, n) => a + n.packed, 0);
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log('packaged  dist/sporecrawl.zip  (' + kb + ' KB, ' + listed.length + ' entries)');
  console.log('verified: PK zip, forward slashes, index.html at root, ' +
    (100 - packed / raw * 100).toFixed(0) + '% compressed\n');
}
