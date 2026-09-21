// Rasterize hand-authored Feather-style SVG icons to PNG via sharp.
const sharp = require('/home/pavan/.npm/_npx/1e7f6d9597241db0/node_modules/sharp');
const fs = require('fs');

const OUT = '/home/pavan/TrustRAG/ppt_assets/icons';
fs.mkdirSync(OUT, { recursive: true });

const STROKE = 'currentColor';
function svg(inner, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

const ICONS = {
  shield: '<path d="M12 2 L21 5 v6 c0 5.5 -3.8 10 -9 11 c-5.2 -1 -9 -5.5 -9 -11 V5 z"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10 V7 a4 4 0 0 1 8 0 v3"/>',
  file: '<path d="M14 3 H7 a2 2 0 0 0 -2 2 v14 a2 2 0 0 0 2 2 h10 a2 2 0 0 0 2 -2 V8 z"/><path d="M14 3 v5 h5"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5 v6 c0 1.7 3.6 3 8 3 s8 -1.3 8 -3 V5"/><path d="M4 11 v6 c0 1.7 3.6 3 8 3 s8 -1.3 8 -3 v-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20 l-4.3 -4.3"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2 v4 M15 2 v4 M9 18 v4 M15 18 v4 M2 9 h4 M2 15 h4 M18 9 h4 M18 15 h4"/>',
  chart: '<path d="M4 20 V10 M10 20 V4 M16 20 v-8 M21 20 H3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12 L20 3 M16.5 3.5 h4 v4"/>',
  check: '<path d="M4 12.5 l5 5 L20 6.5"/>',
  alert: '<path d="M12 3 L22 20 H2 z"/><path d="M12 9 v5"/><path d="M12 17.2 v0.1"/>',
  layers: '<path d="M12 2 L2 7 l10 5 l10 -5 z"/><path d="M2 12 l10 5 l10 -5"/><path d="M2 17 l10 5 l10 -5"/>',
  filter: '<polygon points="3,5 21,5 14,13 14,20 10,20 10,13"/>',
  rocket: '<path d="M12 2.5 c4.2 3.4 6.2 7.4 6.2 11.3 l-3.2 3.2 H9 l-3.2 -3.2 C5.8 9.9 7.8 5.9 12 2.5 z"/><circle cx="12" cy="10" r="1.7"/><path d="M9 20.5 l-1.6 2 M15 20.5 l1.6 2"/>',
  hash: '<path d="M5 9 h14 M5 15 h14 M10.2 4 l-2 16 M15.8 4 l-2 16"/>',
  eye: '<path d="M2 12 s3.6 -6 10 -6 s10 6 10 6 s-3.6 6 -10 6 s-10 -6 -10 -6 z"/><circle cx="12" cy="12" r="2.6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21 c0 -4.2 3.6 -6.2 8 -6.2 s8 2 8 6.2"/>',
  zap: '<path d="M13 2 L4 14 h6 l-1 8 l9 -12 h-6 z"/>',
  scale: '<path d="M12 3 v18 M5 7 h14 M7 7 l-3 6 h6 z M17 7 l-3 6 h6 z"/>',
  book: '<path d="M4 4 a2 2 0 0 1 2 -2 h13 v18 H6 a2 2 0 0 1 -2 -2 z"/><path d="M8 6 h7 M8 10 h7"/>',
  code: '<path d="M8 8 l-4 4 l4 4 M16 8 l4 4 l-4 4 M13 5 l-2 14"/>',
  chat: '<path d="M21 15 a2 2 0 0 1 -2 2 H8 l-5 4 V5 a2 2 0 0 1 2 -2 h14 a2 2 0 0 1 2 2 z"/>',
  arrow: '<path d="M4 12 h15"/><path d="M13 6 l6 6 l-6 6"/>',
};

const COLORS = {
  white: 'FFFFFF',
  teal: '2DD4BF',
  green: '34D399',
  red: 'F46A6A',
  amber: 'F5B544',
  blue: '4D9FFF',
  purple: 'A78BFA',
  muted: '8FA3C4',
  navy: '9FB4D8',
};

async function gen(name, colorName) {
  const color = COLORS[colorName];
  const buf = Buffer.from(svg(ICONS[name], color));
  const path = `${OUT}/${name}-${colorName}.png`;
  await sharp(buf, { density: 384 }).png().toFile(path);
}

(async () => {
  const jobs = [];
  for (const name of Object.keys(ICONS)) {
    for (const colorName of Object.keys(COLORS)) {
      jobs.push(gen(name, colorName));
    }
  }
  await Promise.all(jobs);
  console.log('generated', jobs.length, 'icons in', OUT);
})();
