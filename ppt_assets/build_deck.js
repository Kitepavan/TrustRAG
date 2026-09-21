/* TrustRAG — 10-slide deck generator (pptxgenjs) */
const pptxgen = require('/home/pavan/.npm-global/lib/node_modules/pptxgenjs');

const C = {
  bg: '0B1220', bg2: '0E1730', card: '16213A', card2: '1B2947', line: '2A3B5E',
  text: 'E8EFFB', muted: '93A5C7', faint: '64748F',
  teal: '2DD4BF', blue: '4D9FFF', green: '34D399', red: 'F46A6A', amber: 'F5B544', purple: 'A78BFA',
};
const F = { head: 'Arial', body: 'Arial', mono: 'Courier New' };
const SHOTS = '/home/pavan/TrustRAG/ppt_assets/screenshots/';
const ICONS = '/home/pavan/TrustRAG/ppt_assets/icons/';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5
pres.author = 'TrustRAG';
pres.company = 'TrustRAG';
pres.title = 'TrustRAG — Secure Retrieval-Augmented Generation';
pres.subject = 'Secure RAG Framework';

const SH = (n, c) => ({ type: 'outer', color: '000000', opacity: 0.30, angle: 90, offset: 2.2, blur: 3.5 });

function newSlide() {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  return s;
}

function header(s, kickerText, titleText, subText) {
  s.addShape('ellipse', { x: 0.55, y: 0.55, w: 0.09, h: 0.09, fill: { color: C.teal }, line: { type: 'none' } });
  s.addText(kickerText, { x: 0.73, y: 0.42, w: 11.5, h: 0.3, fontFace: F.head, fontSize: 10.5, bold: true, color: C.teal, charSpacing: 2.6, margin: 0 });
  s.addText(titleText, { x: 0.53, y: 0.68, w: 12.3, h: 0.62, fontFace: F.head, fontSize: 29, bold: true, color: C.text, margin: 0 });
  if (subText) s.addText(subText, { x: 0.55, y: 1.33, w: 12.3, h: 0.34, fontFace: F.body, fontSize: 13, color: C.muted, margin: 0 });
}

function card(s, x, y, w, h, opts = {}) {
  s.addShape('roundRect', {
    x, y, w, h, rectRadius: opts.radius || 0.07,
    fill: { color: opts.fill || C.card },
    line: opts.line === undefined ? { color: C.line, width: 1 } : opts.line,
    shadow: opts.shadow === undefined ? SH() : opts.shadow,
  });
}

const ICON_COLORS = {
  '2DD4BF': 'teal', '4D9FFF': 'blue', '34D399': 'green', 'F46A6A': 'red',
  'F5B544': 'amber', 'A78BFA': 'purple', '93A5C7': 'muted', '9FB4D8': 'navy',
  'FFFFFF': 'white', 'E8EFFB': 'white',
};
function icon(s, name, color, x, y, size) {
  const cname = ICON_COLORS[String(color).toUpperCase()] || color;
  s.addImage({ path: ICONS + name + '-' + cname + '.png', x, y, w: size, h: size });
}

function chip(s, x, y, w, h, text, color, opts = {}) {
  s.addShape('roundRect', {
    x, y, w, h, rectRadius: 0.05,
    fill: { color: opts.fill || C.card2 },
    line: { color: color, width: 1, transparency: 55 },
  });
  s.addText(text, {
    x, y, w, h, align: 'center', valign: 'middle', fontFace: F.head, fontSize: opts.size || 9.5,
    bold: true, color: color, charSpacing: opts.cs || 1.2, margin: 0,
  });
}

function arrowR(s, x, y, w, color) {
  s.addShape('rightArrow', { x, y, w, h: 0.2, fill: { color: color || C.faint }, line: { type: 'none' } });
}
function arrowD(s, x, y, h, color) {
  s.addShape('downArrow', { x, y, w: 0.2, h, fill: { color: color || C.faint }, line: { type: 'none' } });
}
function arrowL(s, x, y, w, color) {
  s.addShape('leftArrow', { x, y, w, h: 0.2, fill: { color: color || C.faint }, line: { type: 'none' } });
}

/* ============================================================ */
/* SLIDE 1 — TITLE                                               */
/* ============================================================ */
(function s1() {
  const s = newSlide();
  s.background = { color: C.bg };
  // faint decorative rings (motif: trust rings)
  s.addShape('ellipse', { x: 9.6, y: -1.4, w: 6.4, h: 6.4, fill: { color: C.bg2 }, line: { color: C.line, width: 1, transparency: 40 } });
  s.addShape('ellipse', { x: 10.6, y: -0.4, w: 4.4, h: 4.4, fill: { color: C.bg }, line: { color: C.line, width: 1, transparency: 55 } });

  // kicker chip
  s.addShape('roundRect', { x: 0.72, y: 0.92, w: 4.62, h: 0.36, rectRadius: 0.05, fill: { color: C.teal, transparency: 88 }, line: { color: C.teal, width: 1, transparency: 45 } });
  s.addText('ACADEMIC INFORMATION SECURITY PROJECT', { x: 0.72, y: 0.92, w: 4.62, h: 0.36, align: 'center', valign: 'middle', fontFace: F.head, fontSize: 9.5, bold: true, color: C.teal, charSpacing: 1.8, margin: 0 });

  // Title: Trust + RAG
  s.addText([
    { text: 'Trust', options: { color: C.text } },
    { text: 'RAG', options: { color: C.teal } },
  ], { x: 0.66, y: 1.42, w: 8.5, h: 1.15, fontFace: F.head, fontSize: 62, bold: true, margin: 0, charSpacing: -1 });

  s.addText('A Secure Retrieval-Augmented Generation Framework', { x: 0.72, y: 2.62, w: 8.2, h: 0.4, fontFace: F.head, fontSize: 19, color: C.muted, margin: 0 });
  s.addText('Defending enterprise AI against knowledge poisoning, prompt injection, and unauthorized access.', { x: 0.72, y: 3.06, w: 7.6, h: 0.34, fontFace: F.body, fontSize: 12.5, color: C.faint, margin: 0 });

  // principle quote card
  card(s, 0.72, 3.62, 7.9, 0.92, { fill: C.card2, line: { color: C.teal, width: 1, transparency: 55 } });
  icon(s, 'shield', 'teal', 0.98, 3.86, 0.44);
  s.addText([
    { text: '“The most semantically relevant document ', options: { color: C.text } },
    { text: 'is not necessarily the safest document.', options: { color: C.teal, italic: true } },
    { text: '”', options: { color: C.text } },
  ], { x: 1.6, y: 3.72, w: 6.85, h: 0.72, fontFace: F.body, fontSize: 13.5, valign: 'middle', margin: 0 });

  // tech chips
  const chips = ['Python · FastAPI', 'Ed25519 + SHA-256', 'ChromaDB', 'EmbeddingGemma-300M', 'OpenRouter LLM', 'React 19 · TS'];
  const cw = [1.62, 1.86, 1.08, 1.94, 1.42, 1.42];
  let cx = 0.72;
  chips.forEach((t, i) => { chip(s, cx, 4.82, cw[i], 0.34, t, C.muted, { fill: C.card, size: 8.6, cs: 0.6 }); cx += cw[i] + 0.16; });

  // footer
  icon(s, 'check', 'green', 0.74, 5.72, 0.15);
  s.addText('All 12 pipeline stages implemented  ·  28/28 automated tests passing  ·  live benchmark: 4/4 attacks blocked', { x: 0.98, y: 5.66, w: 8.2, h: 0.3, fontFace: F.body, fontSize: 11, color: C.muted, margin: 0 });

  // RIGHT: trust shield visual
  card(s, 9.15, 1.28, 3.7, 5.0, { fill: C.bg2, line: { color: C.line, width: 1 }, shadow: SH() });
  icon(s, 'shield', 'teal', 10.42, 1.72, 1.15);
  s.addText('SECURITY ENVELOPE', { x: 9.15, y: 3.02, w: 3.7, h: 0.28, align: 'center', fontFace: F.head, fontSize: 10.5, bold: true, color: C.text, charSpacing: 2, margin: 0 });
  s.addText('Every retrieval candidate is evaluated before it reaches the LLM', { x: 9.45, y: 3.3, w: 3.1, h: 0.5, align: 'center', fontFace: F.body, fontSize: 10.5, color: C.muted, margin: 0 });

  const badges = [
    { t: 'Trusted', d: 'valid signature · clean content', c: C.green, sc: '1.0' },
    { t: 'Suspicious', d: 'unsigned or flagged content', c: C.amber, sc: '0.5–0.6' },
    { t: 'Quarantined', d: 'blocked from the LLM context', c: C.red, sc: '0.0' },
  ];
  badges.forEach((b, i) => {
    const by = 3.94 + i * 0.74;
    card(s, 9.42, by, 3.16, 0.6, { fill: C.card, line: { color: C.line, width: 1 } });
    s.addShape('ellipse', { x: 9.6, y: by + 0.2, w: 0.2, h: 0.2, fill: { color: b.c }, line: { type: 'none' } });
    s.addText(b.t, { x: 9.9, y: by + 0.06, w: 1.5, h: 0.28, fontFace: F.head, fontSize: 11, bold: true, color: b.c, margin: 0 });
    s.addText(b.d, { x: 9.9, y: by + 0.33, w: 1.95, h: 0.24, fontFace: F.body, fontSize: 8.5, color: C.muted, margin: 0 });
    s.addText(b.sc, { x: 11.95, y: by + 0.06, w: 0.6, h: 0.5, align: 'right', valign: 'middle', fontFace: F.mono, fontSize: 10, color: C.muted, margin: 0 });
  });

  s.addNotes('TrustRAG: a security-enhanced RAG framework. Core idea — retrieval is a security decision, not just a similarity search. All 12 build stages complete; 28/28 tests pass; the live benchmark blocks 4 of 4 attack classes.');
})();

/* ============================================================ */
/* SLIDE 2 — PROBLEM                                             */
/* ============================================================ */
(function s2() {
  const s = newSlide();
  header(s, 'THE PROBLEM', 'Standard RAG Trusts Everything It Retrieves',
    'A naive pipeline treats retrieved text as usable knowledge — with no authenticity, integrity, authorization, or content checks at any stage.');

  // LEFT: baseline pipeline card
  card(s, 0.55, 1.82, 4.85, 4.42, { fill: C.card });
  s.addText('BASELINE RAG PIPELINE', { x: 0.85, y: 2.0, w: 4.3, h: 0.26, fontFace: F.head, fontSize: 10, bold: true, color: C.muted, charSpacing: 1.8, margin: 0 });

  const steps = ['Upload document', 'Chunk text (512 / 64)', 'Embed (768-d vectors)', 'Store in vector DB', 'top-K similarity search', 'Send context to LLM'];
  steps.forEach((t, i) => {
    const y = 2.36 + i * 0.6;
    s.addShape('roundRect', { x: 0.85, y, w: 3.3, h: 0.44, rectRadius: 0.05, fill: { color: C.card2 }, line: { color: C.line, width: 1 } });
    s.addText(t, { x: 1.02, y, w: 2.6, h: 0.44, valign: 'middle', fontFace: F.body, fontSize: 11, color: C.text, margin: 0 });
    // red "no verification" mark
    s.addShape('ellipse', { x: 4.28, y: y + 0.1, w: 0.24, h: 0.24, fill: { color: C.red, transparency: 78 }, line: { color: C.red, width: 1 } });
    s.addText('✕', { x: 4.28, y: y + 0.1, w: 0.24, h: 0.24, align: 'center', valign: 'middle', fontFace: F.head, fontSize: 9, bold: true, color: C.red, margin: 0 });
    if (i < steps.length - 1) arrowD(s, 2.42, y + 0.46, 0.13, C.faint);
  });
  s.addText('No verification at any stage', { x: 0.85, y: 6.02, w: 4.3, h: 0.24, align: 'center', fontFace: F.body, fontSize: 10.5, italic: true, color: C.red, margin: 0 });

  // RIGHT: three threat cards
  const threats = [
    { ic: 'hash', t: 'KNOWLEDGE POISONING', d: 'An attacker uploads a document semantically similar to a real policy but with inverted guidance — “Passwords are no longer required.” Retrieval surfaces it and the LLM answers from it.' },
    { ic: 'eye', t: 'INDIRECT PROMPT INJECTION', d: 'Retrieved text embeds overrides — “IGNORE ALL PREVIOUS INSTRUCTIONS” — hijacking the model from inside the context window, even when the model itself is functioning perfectly.' },
    { ic: 'lock', t: 'TAMPERING & UNAUTHORIZED ACCESS', d: 'Modified files index undetected, and any employee can retrieve HR- or IT-confidential documents. A valid-looking answer may come from tampered or unauthorized sources.' },
  ];
  threats.forEach((th, i) => {
    const x = 5.68, y = 1.82 + i * 1.52, w = 7.1, h = 1.38;
    card(s, x, y, w, h, { fill: C.card, line: { color: C.line, width: 1 } });
    s.addShape('ellipse', { x: x + 0.22, y: y + 0.24, w: 0.5, h: 0.5, fill: { color: C.red, transparency: 84 }, line: { color: C.red, width: 1 } });
    icon(s, th.ic, 'red', x + 0.31, y + 0.33, 0.32);
    s.addText(th.t, { x: x + 0.86, y: y + 0.16, w: w - 1.1, h: 0.3, fontFace: F.head, fontSize: 12, bold: true, color: C.text, charSpacing: 0.6, margin: 0 });
    s.addText(th.d, { x: x + 0.86, y: y + 0.46, w: w - 1.12, h: 0.82, fontFace: F.body, fontSize: 10.5, color: C.muted, margin: 0, valign: 'top' });
  });

  // bottom insight banner
  card(s, 0.55, 6.44, 12.23, 0.68, { fill: C.card2, line: { color: C.teal, width: 1, transparency: 55 } });
  icon(s, 'scale', 'teal', 0.82, 6.62, 0.32);
  s.addText('Relevance alone cannot guarantee safety — retrieval must also prove authenticity, authorization, and integrity.', { x: 1.3, y: 6.44, w: 11.3, h: 0.68, valign: 'middle', fontFace: F.body, fontSize: 12.5, italic: true, color: C.text, margin: 0 });

  s.addNotes('The threat model: three attack classes that exploit naive retrieval. Key point — the LLM is not broken; the retrieval layer is unsafe. This is why security must protect the pipeline, not just the model.');
})();

/* ============================================================ */
/* SLIDE 3 — SOLUTION                                            */
/* ============================================================ */
(function s3() {
  const s = newSlide();
  header(s, 'THE SOLUTION', 'Trust Beyond Relevance',
    'TrustRAG evaluates every retrieval candidate on security as rigorously as on semantic similarity — before a single token reaches the LLM.');

  // equation row
  const eq = [
    { t: 'Semantic\nRelevance', c: C.blue },
    { t: 'Trust\nStatus', c: C.teal },
    { t: 'Authorization\n(RBAC)', c: C.amber },
    { t: 'Provenance', c: C.purple },
    { t: 'Security\nScans', c: C.green },
  ];
  const ew = 1.72;
  let ex = 0.55;
  eq.forEach((e, i) => {
    card(s, ex, 1.84, ew, 0.92, { fill: C.card, line: { color: e.c, width: 1, transparency: 45 } });
    s.addText(e.t, { x: ex, y: 1.84, w: ew, h: 0.92, align: 'center', valign: 'middle', fontFace: F.head, fontSize: 10.5, bold: true, color: e.c, margin: 0 });
    if (i < eq.length - 1) { s.addText('+', { x: ex + ew, y: 1.84, w: 0.3, h: 0.92, align: 'center', valign: 'middle', fontFace: F.head, fontSize: 15, bold: true, color: C.faint, margin: 0 }); ex += ew + 0.3; }
    else ex += ew + 0.3;
  });
  s.addText('=', { x: ex, y: 1.84, w: 0.3, h: 0.92, align: 'center', valign: 'middle', fontFace: F.head, fontSize: 16, bold: true, color: C.faint, margin: 0 });
  card(s, ex + 0.3, 1.84, 2.35, 0.92, { fill: C.teal, transparency: 84, line: { color: C.teal, width: 1.2 } });
  s.addText('VERIFIED, AUTHORIZED CONTEXT', { x: ex + 0.3, y: 1.84, w: 2.35, h: 0.92, align: 'center', valign: 'middle', fontFace: F.head, fontSize: 10.5, bold: true, color: C.teal, margin: 0 });

  // comparison cards
  const comps = [
    { x: 0.55, name: 'malicious_policy.pdf', sim: '0.97', rows: [['Trust', 'LOW', C.red], ['Poisoned', 'YES', C.red], ['Signature', 'INVALID', C.red]], verdict: 'BLOCK', vc: C.red },
    { x: 6.83, name: 'security_policy.pdf', sim: '0.93', rows: [['Trust', 'HIGH', C.green], ['Authorized', 'YES', C.green], ['Provenance', 'VERIFIED', C.green]], verdict: 'USE', vc: C.green },
  ];
  comps.forEach((c, i) => {
    card(s, c.x, 3.04, 5.95, 1.86, { fill: C.card, line: { color: c.vc, width: 1.2, transparency: 40 } });
    icon(s, i === 0 ? 'alert' : 'file', c.vc, c.x + 0.24, 3.26, 0.34);
    s.addText(c.name, { x: c.x + 0.7, y: 3.18, w: 3.4, h: 0.3, fontFace: F.mono, fontSize: 11.5, bold: true, color: C.text, margin: 0 });
    s.addText('similarity ' + c.sim, { x: c.x + 4.2, y: 3.18, w: 1.55, h: 0.3, align: 'right', fontFace: F.mono, fontSize: 10, color: C.muted, margin: 0 });
    let ry = 3.56;
    c.rows.forEach((r) => {
      s.addText(r[0], { x: c.x + 0.26, y: ry, w: 1.4, h: 0.26, fontFace: F.body, fontSize: 10.5, color: C.muted, margin: 0 });
      s.addText(r[1], { x: c.x + 1.6, y: ry, w: 1.6, h: 0.26, fontFace: F.head, fontSize: 10.5, bold: true, color: r[2], margin: 0 });
      ry += 0.3;
    });
    chip(s, c.x + 4.42, 3.96, 1.25, 0.4, c.verdict, c.vc, { size: 11, cs: 1.5 });
    s.addText(i === 0 ? 'Most similar — but every security signal fails' : 'Slightly less similar — every security signal passes', { x: c.x + 0.26, y: 4.5, w: 5.5, h: 0.26, fontFace: F.body, fontSize: 10, italic: true, color: C.muted, margin: 0 });
  });

  // defense in depth strip
  s.addText('DEFENSE IN DEPTH — a malicious document is stopped at four independent checkpoints', { x: 0.55, y: 5.12, w: 12.2, h: 0.3, fontFace: F.head, fontSize: 11, bold: true, color: C.text, charSpacing: 1, margin: 0 });
  const cp = [
    { ic: 'hash', t: 'Ingestion scan', d: 'Signature verify + content scan at upload' },
    { ic: 'database', t: 'Vector store', d: 'Security metadata persisted per chunk' },
    { ic: 'filter', t: 'Retrieval filters', d: 'Quarantine · RBAC · injection rescan' },
    { ic: 'lock', t: 'Pre-LLM boundary', d: 'Context wrapped as UNTRUSTED DATA' },
  ];
  const cw2 = 2.93;
  cp.forEach((c2, i) => {
    const x = 0.55 + i * (cw2 + 0.17);
    card(s, x, 5.5, cw2, 1.5, { fill: C.card, line: { color: C.line, width: 1 } });
    s.addShape('ellipse', { x: x + 0.2, y: 5.7, w: 0.42, h: 0.42, fill: { color: C.teal, transparency: 86 }, line: { color: C.teal, width: 1 } });
    icon(s, c2.ic, 'teal', x + 0.28, 5.78, 0.26);
    s.addText(c2.t, { x: x + 0.72, y: 5.72, w: cw2 - 0.85, h: 0.38, valign: 'middle', fontFace: F.head, fontSize: 11, bold: true, color: C.text, margin: 0 });
    s.addText(c2.d, { x: x + 0.2, y: 6.24, w: cw2 - 0.4, h: 0.64, fontFace: F.body, fontSize: 9.5, color: C.muted, margin: 0 });
    if (i < cp.length - 1) arrowR(s, x + cw2 + 0.01, 6.18, 0.15, C.faint);
  });

  s.addNotes('The core decision rule: relevance + trust + authorization + provenance + security scans. The example shows a higher-similarity malicious document losing to a lower-similarity verified one. Defense in depth means four independent checkpoints.');
})();

/* ============================================================ */
/* SLIDE 4 — SYSTEM ARCHITECTURE                                 */
/* ============================================================ */
(function s4() {
  const s = newSlide();
  header(s, 'SYSTEM ARCHITECTURE', 'Security Wrapped Around the RAG Core');

  const bx = 3.22, bw = 6.86;

  // Band 1 — presentation
  card(s, bx, 1.72, bw, 0.8, { fill: C.card });
  icon(s, 'layers', 'blue', bx + 0.2, 1.9, 0.3);
  s.addText('PRESENTATION LAYER', { x: bx + 0.6, y: 1.8, w: 3.2, h: 0.26, fontFace: F.head, fontSize: 10.5, bold: true, color: C.blue, charSpacing: 1.4, margin: 0 });
  s.addText('React 19 · TypeScript (strict) · Vite · Tailwind v4 — 6-page security dashboard', { x: bx + 0.6, y: 2.08, w: bw - 0.8, h: 0.26, fontFace: F.body, fontSize: 10.5, color: C.muted, margin: 0 });
  s.addText('browser', { x: bx + bw - 1.5, y: 1.9, w: 1.3, h: 0.3, align: 'right', fontFace: F.mono, fontSize: 8.5, color: C.faint, margin: 0 });
  arrowD(s, 6.55, 2.56, 0.16, C.faint);

  // Band 2 — API
  card(s, bx, 2.76, bw, 0.8, { fill: C.card });
  icon(s, 'code', 'blue', bx + 0.2, 2.94, 0.3);
  s.addText('API LAYER', { x: bx + 0.6, y: 2.84, w: 3.2, h: 0.26, fontFace: F.head, fontSize: 10.5, bold: true, color: C.blue, charSpacing: 1.4, margin: 0 });
  s.addText('FastAPI · Uvicorn — /auth · /documents · /query · /evaluation · /dashboard', { x: bx + 0.6, y: 3.12, w: bw - 0.8, h: 0.26, fontFace: F.mono, fontSize: 10, color: C.muted, margin: 0 });
  s.addText('CORS-locked', { x: bx + bw - 1.5, y: 2.94, w: 1.3, h: 0.3, align: 'right', fontFace: F.mono, fontSize: 8.5, color: C.faint, margin: 0 });
  arrowD(s, 6.55, 3.6, 0.16, C.faint);

  // Band 3 — security envelope (highlighted)
  s.addShape('roundRect', { x: bx, y: 3.8, w: bw, h: 1.2, rectRadius: 0.07, fill: { color: C.teal, transparency: 90 }, line: { color: C.teal, width: 1.4, dashType: 'dash' }, shadow: SH() });
  icon(s, 'shield', 'teal', bx + 0.2, 4.22, 0.34);
  s.addText('SECURITY ENVELOPE', { x: bx + 0.64, y: 3.94, w: 4.0, h: 0.28, fontFace: F.head, fontSize: 11, bold: true, color: C.teal, charSpacing: 1.6, margin: 0 });
  s.addText('Every request crosses these controls', { x: bx + 0.64, y: 4.2, w: 4.6, h: 0.24, fontFace: F.body, fontSize: 9.5, italic: true, color: C.muted, margin: 0 });
  const secChips = ['Ed25519 + SHA-256', 'Poison / Injection detectors', 'Trust Engine', 'JWT + RBAC', 'Provenance'];
  const scw = [1.86, 2.16, 1.16, 1.26, 1.2];
  let sx = bx + 0.2;
  secChips.forEach((t, i) => { chip(s, sx, 4.52, scw[i], 0.32, t, C.teal, { size: 8.4, cs: 0.4, fill: C.card }); sx += scw[i] + 0.1; });
  arrowD(s, 6.55, 5.04, 0.16, C.teal);

  // Band 4 — RAG core
  card(s, bx, 5.24, bw, 1.56, { fill: C.card });
  icon(s, 'chip', 'green', bx + 0.2, 5.46, 0.3);
  s.addText('RAG CORE', { x: bx + 0.6, y: 5.4, w: 3.2, h: 0.26, fontFace: F.head, fontSize: 10.5, bold: true, color: C.green, charSpacing: 1.4, margin: 0 });
  const rag = [
    { t: 'Ingestion', d: 'validate · hash · verify · scan' },
    { t: 'Chunking', d: '512 chars · 64 overlap' },
    { t: 'EmbeddingGemma', d: '768-d, local inference' },
    { t: 'ChromaDB', d: 'cosine + security metadata' },
    { t: 'Secure Retrieval', d: 'filters + trust ranking' },
    { t: 'LLM wrapper', d: 'untrusted-context prompt' },
  ];
  rag.forEach((r, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const rx = bx + 0.22 + col * 2.24, ry = 5.76 + row * 0.5;
    s.addShape('roundRect', { x: rx, y: ry, w: 2.12, h: 0.42, rectRadius: 0.05, fill: { color: C.card2 }, line: { color: C.line, width: 1 } });
    s.addText(r.t, { x: rx + 0.1, y: ry + 0.03, w: 1.92, h: 0.2, fontFace: F.head, fontSize: 8.6, bold: true, color: C.text, margin: 0 });
    s.addText(r.d, { x: rx + 0.1, y: ry + 0.21, w: 1.92, h: 0.2, fontFace: F.body, fontSize: 7.6, color: C.muted, margin: 0 });
  });

  // LEFT: data layer
  s.addText('DATA LAYER', { x: 0.55, y: 3.84, w: 2.5, h: 0.26, fontFace: F.head, fontSize: 10, bold: true, color: C.muted, charSpacing: 1.6, margin: 0 });
  const data = [
    { ic: 'database', t: 'ChromaDB', d: 'vector store · cosine' },
    { ic: 'file', t: 'data/trusted', d: 'document object store' },
    { ic: 'book', t: 'provenance_log.json', d: 'mutable log (not tamper-evident)' },
    { ic: 'key', t: 'data/keys', d: 'Ed25519 keypair' },
  ];
  data.forEach((d, i) => {
    const y = 4.16 + i * 0.66;
    card(s, 0.55, y, 2.5, 0.56, { fill: C.card, line: { color: C.line, width: 1 } });
    icon(s, d.ic, 'navy', 0.7, y + 0.13, 0.3);
    s.addText(d.t, { x: 1.08, y: y + 0.04, w: 1.85, h: 0.24, fontFace: F.mono, fontSize: 9, bold: true, color: C.text, margin: 0 });
    s.addText(d.d, { x: 1.08, y: y + 0.27, w: 1.85, h: 0.22, fontFace: F.body, fontSize: 8, color: C.muted, margin: 0 });
  });
  arrowL(s, 3.08, 5.96, 0.24, C.faint);
  s.addText('read / write', { x: 2.62, y: 5.72, w: 1.1, h: 0.2, align: 'center', fontFace: F.mono, fontSize: 7, color: C.faint, margin: 0, rotate: 0 });

  // RIGHT: external services
  s.addText('EXTERNAL SERVICES', { x: 10.28, y: 3.84, w: 2.5, h: 0.26, fontFace: F.head, fontSize: 10, bold: true, color: C.muted, charSpacing: 1.4, margin: 0 });
  card(s, 10.28, 4.16, 2.5, 1.3, { fill: C.card, line: { color: C.purple, width: 1, transparency: 45 } });
  icon(s, 'chip', 'purple', 10.5, 4.36, 0.3);
  s.addText('OpenRouter', { x: 10.9, y: 4.34, w: 1.7, h: 0.28, fontFace: F.head, fontSize: 11, bold: true, color: C.text, margin: 0 });
  s.addText('nemotron-3.5-lightning:free', { x: 10.5, y: 4.72, w: 2.1, h: 0.24, fontFace: F.mono, fontSize: 7.2, color: C.muted, margin: 0 });
  s.addText('chat completions · retried', { x: 10.5, y: 4.98, w: 2.1, h: 0.24, fontFace: F.body, fontSize: 8, color: C.muted, margin: 0 });
  card(s, 10.28, 5.6, 2.5, 0.9, { fill: C.card, line: { color: C.line, width: 1 } });
  icon(s, 'user', 'amber', 10.5, 5.78, 0.28);
  s.addText('JWT Bearer', { x: 10.9, y: 5.74, w: 1.7, h: 0.26, fontFace: F.head, fontSize: 10, bold: true, color: C.text, margin: 0 });
  s.addText('4 demo personas · RBAC', { x: 10.5, y: 6.06, w: 2.1, h: 0.24, fontFace: F.body, fontSize: 8, color: C.muted, margin: 0 });
  arrowR(s, 10.12, 4.72, 0.22, C.faint);
  s.addText('prompt', { x: 9.72, y: 4.48, w: 0.9, h: 0.2, align: 'center', fontFace: F.mono, fontSize: 7, color: C.faint, margin: 0 });

  // footnote
  s.addText('Controls run at ingestion and again at retrieval — no single point of trust, and the baseline path is preserved for A/B measurement.', { x: 0.55, y: 6.94, w: 12.2, h: 0.3, fontFace: F.body, fontSize: 10.5, italic: true, color: C.muted, margin: 0 });

  s.addNotes('Layered architecture: React frontend, FastAPI API, a security envelope that every request crosses, and the RAG core. Data stores on the left; the external OpenRouter LLM on the right. Note the envelope is dashed — it is woven into the pipeline rather than a separate proxy.');
})();

/* ============================================================ */
/* SLIDE 5 — INGESTION PIPELINE                                  */
/* ============================================================ */
(function s5() {
  const s = newSlide();
  header(s, 'RAG WORKFLOW · INGESTION', 'Secure Ingestion Pipeline',
    'Every document is cryptographically verified, content-scanned, and trust-classified before a single chunk is indexed.');

  const steps = [
    { n: 1, t: 'Upload & Validate', d: 'Type · 50 MB cap · readable · server-generated IDs', ic: 'file', c: C.blue },
    { n: 2, t: 'SHA-256 Hash', d: 'Content fingerprint recorded for tamper detection', ic: 'hash', c: C.blue },
    { n: 3, t: 'Ed25519 Verify', d: 'Fails closed on bad, forged, or missing signature', ic: 'key', c: C.teal },
    { n: 4, t: 'Extract Text', d: 'PyMuPDF (PDF) · python-docx (DOCX) · TXT', ic: 'search', c: C.blue },
    { n: 5, t: 'Content Scan', d: 'Poison + injection pattern detectors', ic: 'eye', c: C.amber },
    { n: 6, t: 'Trust Engine', d: 'Multi-signal evaluation → category + score', ic: 'shield', c: C.teal },
    { n: 7, t: 'Provenance Record', d: 'Atomic, mutable entry (not tamper-evident)', ic: 'book', c: C.purple },
    { n: 8, t: 'Chunk → Embed → Store', d: '512/64 chunks · 768-d vectors · security metadata', ic: 'database', c: C.green },
  ];
  const sw = 2.93, sh = 1.28;
  // row 1: left to right (steps 1-4)
  steps.slice(0, 4).forEach((st, i) => {
    const x = 0.55 + i * (sw + 0.17);
    stepCard(s, x, 1.84, sw, sh, st);
    if (i < 3) arrowR(s, x + sw + 0.005, 2.4, 0.16, C.faint);
  });
  // down arrow on the right
  s.addShape('downArrow', { x: 0.55 + 3 * (sw + 0.17) + sw / 2 - 0.1, y: 3.16, w: 0.2, h: 0.2, fill: { color: C.faint }, line: { type: 'none' } });
  // row 2: right to left (steps 5-8)
  steps.slice(4).forEach((st, i) => {
    const x = 0.55 + (3 - i) * (sw + 0.17);
    stepCard(s, x, 3.42, sw, sh, st);
    if (i < 3) arrowL(s, x - 0.165, 3.98, 0.16, C.faint);
  });

  function stepCard(s, x, y, w, h, st) {
    card(s, x, y, w, h, { fill: C.card, line: { color: C.line, width: 1 } });
    s.addShape('ellipse', { x: x + 0.16, y: y + 0.16, w: 0.34, h: 0.34, fill: { color: st.c, transparency: 82 }, line: { color: st.c, width: 1 } });
    s.addText(String(st.n), { x: x + 0.16, y: y + 0.16, w: 0.34, h: 0.34, align: 'center', valign: 'middle', fontFace: F.head, fontSize: 11, bold: true, color: st.c, margin: 0 });
    s.addText(st.t, { x: x + 0.6, y: y + 0.2, w: w - 0.75, h: 0.28, fontFace: F.head, fontSize: 11.5, bold: true, color: C.text, margin: 0 });
    s.addText(st.d, { x: x + 0.6, y: y + 0.52, w: w - 0.75, h: 0.62, fontFace: F.body, fontSize: 9.5, color: C.muted, margin: 0 });
  }

  // trust outcomes band
  s.addText('TRUST ENGINE OUTCOMES', { x: 0.55, y: 4.94, w: 12.2, h: 0.28, fontFace: F.head, fontSize: 11, bold: true, color: C.text, charSpacing: 1.4, margin: 0 });
  const outs = [
    { t: 'Trusted', sc: '1.0', pd: 'ALLOW', c: C.green, d: 'Valid Ed25519 signature + clean content scan' },
    { t: 'Suspicious', sc: '0.5 – 0.6', pd: 'ALLOW WITH WARNING', c: C.amber, d: 'Unsigned, or signed but flagged for poisoning' },
    { t: 'Quarantined', sc: '0.0 – 0.1', pd: 'BLOCK', c: C.red, d: 'Bad signature · injection detected · unsigned + poisoned' },
  ];
  outs.forEach((o, i) => {
    const x = 0.55 + i * (3.97 + 0.16);
    card(s, x, 5.3, 3.97, 1.32, { fill: C.card, line: { color: o.c, width: 1.2, transparency: 45 } });
    s.addShape('ellipse', { x: x + 0.2, y: 5.52, w: 0.22, h: 0.22, fill: { color: o.c }, line: { type: 'none' } });
    s.addText(o.t, { x: x + 0.52, y: 5.44, w: 1.6, h: 0.32, fontFace: F.head, fontSize: 13, bold: true, color: o.c, margin: 0 });
    s.addText('score ' + o.sc, { x: x + 2.1, y: 5.48, w: 1.7, h: 0.28, align: 'right', fontFace: F.mono, fontSize: 9.5, color: C.muted, margin: 0 });
    chip(s, x + 0.2, 5.84, o.pd.length > 12 ? 1.95 : 1.1, 0.3, o.pd, o.c, { size: 8.6, cs: 1, fill: C.card2 });
    s.addText(o.d, { x: x + 0.2, y: 6.22, w: 3.6, h: 0.32, fontFace: F.body, fontSize: 9.5, color: C.muted, margin: 0 });
  });

  s.addText('Security metadata — sha256 · signature_valid · trust_status · access_level — is stored on every chunk, so the retrieval filters can fire at query time.', { x: 0.55, y: 6.86, w: 12.2, h: 0.3, fontFace: F.body, fontSize: 10.5, italic: true, color: C.muted, margin: 0 });

  s.addNotes('Ingestion: eight steps, verified before indexing. The trust engine produces three categorical outcomes with policy decisions. Crucially, security metadata is persisted per chunk in ChromaDB — that is what makes retrieval-time RBAC and quarantine enforcement possible.');
})();

/* ============================================================ */
/* SLIDE 6 — RETRIEVAL PIPELINE                                  */
/* ============================================================ */
(function s6() {
  const s = newSlide();
  header(s, 'RAG WORKFLOW · RETRIEVAL', 'Secure Retrieval Pipeline',
    'Three defense filters run at query time — only trusted, authorized, clean context reaches the LLM.');

  const flow = [
    { t: 'Authenticated Query', d: 'JWT verify · RBAC clearance', ic: 'user', c: C.blue },
    { t: 'Query Embedding', d: 'EmbeddingGemma · 768-d', ic: 'chip', c: C.blue },
    { t: 'Candidate Fetch', d: 'ChromaDB cosine · top_k × 3', ic: 'database', c: C.blue },
    { t: 'Security Filters', d: 'three defense filters', ic: 'filter', c: C.teal },
    { t: 'Trust-Ranked Context', d: '<trusted_context> envelope', ic: 'shield', c: C.teal },
    { t: 'LLM Answer', d: 'OpenRouter + citations', ic: 'chat', c: C.green },
  ];
  const fw = 1.9;
  flow.forEach((f, i) => {
    const x = 0.55 + i * (fw + 0.14);
    const hl = f.t === 'Security Filters';
    s.addShape('roundRect', { x, y: 1.84, w: fw, h: 1.3, rectRadius: 0.07, fill: { color: hl ? C.teal : C.card, transparency: hl ? 88 : 0 }, line: { color: hl ? C.teal : C.line, width: hl ? 1.4 : 1 }, shadow: SH() });
    s.addShape('ellipse', { x: x + fw / 2 - 0.21, y: 1.98, w: 0.42, h: 0.42, fill: { color: C.bg2 }, line: { color: f.c, width: 1 } });
    icon(s, f.ic, f.c === C.teal ? 'teal' : (f.c === C.green ? 'green' : 'blue'), x + fw / 2 - 0.13, 2.06, 0.26);
    s.addText(f.t, { x: x + 0.08, y: 2.44, w: fw - 0.16, h: 0.4, align: 'center', fontFace: F.head, fontSize: 10, bold: true, color: C.text, margin: 0 });
    s.addText(f.d, { x: x + 0.08, y: 2.82, w: fw - 0.16, h: 0.3, align: 'center', fontFace: f.d.includes('<') ? F.mono : F.body, fontSize: 8, color: C.muted, margin: 0 });
    if (i < flow.length - 1) arrowR(s, x + fw + 0.005, 2.42, 0.13, C.faint);
  });

  // filters container
  card(s, 0.55, 3.42, 8.85, 3.28, { fill: C.card, line: { color: C.teal, width: 1.2, transparency: 55 } });
  s.addText('THREE DEFENSE FILTERS', { x: 0.85, y: 3.58, w: 5.0, h: 0.28, fontFace: F.head, fontSize: 11, bold: true, color: C.teal, charSpacing: 1.6, margin: 0 });
  s.addText('applied to every candidate chunk', { x: 5.0, y: 3.6, w: 4.1, h: 0.26, align: 'right', fontFace: F.body, fontSize: 9.5, italic: true, color: C.muted, margin: 0 });

  const filters = [
    { n: 'F1', t: 'Quarantine Block', d: 'Strictly drop any chunk whose document is Quarantined — tampered, unsigned+poisoned, or injection-carrying content never enters the context.', r: 'BLOCKED_QUARANTINED', ic: 'alert', c: C.red },
    { n: 'F2', t: 'RBAC Clearance', d: 'Compare the chunk’s stored access_level against the caller’s clearance tags — an Employee cannot retrieve HR- or IT-confidential chunks.', r: 'BLOCKED_UNAUTHORIZED_RBAC', ic: 'lock', c: C.amber },
    { n: 'F3', t: 'Injection Rescan', d: 'A second prompt-injection scan of the retrieved text — defense in depth catches what ingestion missed or what was inserted later.', r: 'BLOCKED_RETRIEVAL_PROMPT_INJECTION', ic: 'eye', c: C.purple },
  ];
  filters.forEach((f, i) => {
    const x = 0.85 + i * 2.86;
    card(s, x, 3.96, 2.68, 2.52, { fill: C.card2, line: { color: C.line, width: 1 } });
    s.addShape('ellipse', { x: x + 0.16, y: 4.12, w: 0.4, h: 0.4, fill: { color: f.c, transparency: 82 }, line: { color: f.c, width: 1 } });
    s.addText(f.n, { x: x + 0.16, y: 4.12, w: 0.4, h: 0.4, align: 'center', valign: 'middle', fontFace: F.head, fontSize: 10, bold: true, color: f.c, margin: 0 });
    s.addText(f.t, { x: x + 0.64, y: 4.16, w: 1.95, h: 0.3, fontFace: F.head, fontSize: 11, bold: true, color: C.text, margin: 0 });
    s.addText(f.d, { x: x + 0.16, y: 4.62, w: 2.36, h: 1.4, fontFace: F.body, fontSize: 9, color: C.muted, margin: 0 });
    s.addText(f.r, { x: x + 0.16, y: 6.06, w: 2.36, h: 0.3, fontFace: F.mono, fontSize: 7.2, color: f.c, margin: 0 });
  });

  // baseline control card
  card(s, 9.62, 3.42, 3.16, 3.28, { fill: C.card, line: { color: C.red, width: 1.2, transparency: 50 } });
  icon(s, 'chart', 'red', 9.86, 3.64, 0.3);
  s.addText('BASELINE CONTROL', { x: 10.24, y: 3.66, w: 2.3, h: 0.28, fontFace: F.head, fontSize: 10.5, bold: true, color: C.red, charSpacing: 1.2, margin: 0 });
  s.addText('An unfiltered mode disables all three filters — the academic control used to measure the security delta.', { x: 9.86, y: 4.06, w: 2.7, h: 0.9, fontFace: F.body, fontSize: 9.5, color: C.muted, margin: 0 });
  s.addShape('roundRect', { x: 9.86, y: 4.98, w: 2.7, h: 0.46, rectRadius: 0.05, fill: { color: C.red, transparency: 86 }, line: { color: C.red, width: 1 } });
  s.addText('GATED: Admin · IT_Security only', { x: 9.86, y: 4.98, w: 2.7, h: 0.46, align: 'center', valign: 'middle', fontFace: F.head, fontSize: 8, bold: true, color: C.red, margin: 0 });
  s.addText('Survivors are ranked Trusted-first, then by similarity — relevance only breaks ties among equal-trust candidates.', { x: 9.86, y: 5.6, w: 2.7, h: 0.9, fontFace: F.body, fontSize: 9, italic: true, color: C.muted, margin: 0 });

  s.addNotes('Retrieval: six stages, with the three defense filters as the differentiator. F1 quarantine, F2 RBAC, F3 injection rescan. Candidates are over-fetched (top_k x 3) so filtering does not starve the context. Baseline mode is deliberately preserved but gated, for measurable A/B comparison.');
})();

/* ============================================================ */
/* SLIDE 7 — TECH STACK + DASHBOARD SCREENSHOT                   */
/* ============================================================ */
(function s7() {
  const s = newSlide();
  header(s, 'IMPLEMENTATION', 'Technology Stack',
    'Deliberately simple, dependency-light, and fully local — document text and embeddings never leave the enterprise.');

  const stack = [
    { ic: 'code', c: C.blue, t: 'Backend', d: 'Python 3.12 · FastAPI · Uvicorn' },
    { ic: 'key', c: C.teal, t: 'Cryptography', d: 'Ed25519 signatures · SHA-256 digests' },
    { ic: 'lock', c: C.amber, t: 'AuthN / AuthZ', d: 'JWT (HS256) Bearer · RBAC clearance levels' },
    { ic: 'chip', c: C.green, t: 'Embeddings', d: 'EmbeddingGemma-300M · 768-d · local CPU' },
    { ic: 'database', c: C.purple, t: 'Vector Database', d: 'ChromaDB · persistent · cosine similarity' },
    { ic: 'chat', c: C.red, t: 'LLM', d: 'OpenRouter · nemotron-3.5-lightning' },
    { ic: 'layers', c: 'navy', t: 'Frontend', d: 'React 19 · TypeScript strict · Vite · Tailwind v4' },
  ];
  stack.forEach((st, i) => {
    const y = 1.8 + i * 0.71;
    card(s, 0.55, y, 5.25, 0.6, { fill: C.card, line: { color: C.line, width: 1 } });
    s.addShape('ellipse', { x: 0.75, y: y + 0.13, w: 0.34, h: 0.34, fill: { color: st.c, transparency: 84 }, line: { color: st.c, width: 1 } });
    icon(s, st.ic, st.c, 0.83, y + 0.21, 0.18);
    s.addText(st.t, { x: 1.22, y: y + 0.05, w: 2.0, h: 0.28, fontFace: F.head, fontSize: 11, bold: true, color: C.text, margin: 0 });
    s.addText(st.d, { x: 1.22, y: y + 0.31, w: 4.4, h: 0.24, fontFace: F.body, fontSize: 9, color: C.muted, margin: 0 });
  });

  // screenshot frame
  const ix = 6.15, iy = 1.8, iw = 6.62, ih = iw * 900 / 1440;
  s.addShape('roundRect', { x: ix - 0.09, y: iy - 0.09, w: iw + 0.18, h: ih + 0.18, rectRadius: 0.1, fill: { color: C.card2 }, line: { color: C.line, width: 1 }, shadow: SH() });
  s.addImage({ path: SHOTS + 'dashboard.png', x: ix, y: iy, w: iw, h: ih });
  s.addText('Live dashboard — real statistics streamed from the running backend: documents indexed, chunks stored, model and pipeline health.', { x: ix, y: iy + ih + 0.16, w: iw, h: 0.44, fontFace: F.body, fontSize: 9.5, italic: true, color: C.muted, margin: 0 });

  s.addNotes('Stack is intentionally conservative and local-first: local embeddings mean document text never leaves the enterprise; only the final prompt goes to the OpenRouter LLM. The screenshot is the real running dashboard, not a mockup.');
})();

/* ============================================================ */
/* SLIDE 8 — CHAT SCREENSHOT                                     */
/* ============================================================ */
(function s8() {
  const s = newSlide();
  header(s, 'IMPLEMENTATION', 'Secure RAG Chat — Verified Answers with Citations');

  const ix = 0.55, iy = 1.72, iw = 8.35, ih = iw * 900 / 1440;
  s.addShape('roundRect', { x: ix - 0.09, y: iy - 0.09, w: iw + 0.18, h: ih + 0.18, rectRadius: 0.1, fill: { color: C.card2 }, line: { color: C.line, width: 1 }, shadow: SH() });
  s.addImage({ path: SHOTS + 'chat_secure.png', x: ix, y: iy, w: iw, h: ih });

  const pts = [
    { ic: 'file', c: C.teal, t: 'Cited answers', d: 'Every response lists its sources — document ID, page, similarity score, and a live trust badge.' },
    { ic: 'filter', c: C.amber, t: 'Mode-aware retrieval', d: 'Secure mode enforces all three defense filters; the unfiltered baseline toggle is gated to Admin / IT_Security.' },
    { ic: 'lock', c: C.red, t: 'Untrusted-data boundary', d: 'Context is wrapped in explicit <trusted_context> tags the system prompt treats as data, never instructions.' },
    { ic: 'check', c: C.green, t: 'Honest failures', d: 'If no authorized, trusted document matches, the system says so instead of guessing.' },
  ];
  pts.forEach((p, i) => {
    const y = 1.72 + i * 1.34;
    card(s, 9.18, y, 3.6, 1.2, { fill: C.card, line: { color: C.line, width: 1 } });
    s.addShape('ellipse', { x: 9.38, y: y + 0.18, w: 0.4, h: 0.4, fill: { color: p.c, transparency: 84 }, line: { color: p.c, width: 1 } });
    icon(s, p.ic, p.c, 9.46, y + 0.26, 0.24);
    s.addText(p.t, { x: 9.9, y: y + 0.12, w: 2.7, h: 0.28, fontFace: F.head, fontSize: 10.5, bold: true, color: C.text, margin: 0 });
    s.addText(p.d, { x: 9.38, y: y + 0.56, w: 3.2, h: 0.6, fontFace: F.body, fontSize: 8.6, color: C.muted, margin: 0 });
  });

  s.addNotes('The chat page is the user-facing proof: answers carry per-source citations with trust badges, the retrieval mode is explicit, and the prompt envelope treats retrieved text as untrusted data. This is a live screenshot of the running app answering a policy question from the signed, Trusted document.');
})();

/* ============================================================ */
/* SLIDE 9 — BENCHMARK RESULTS                                   */
/* ============================================================ */
(function s9() {
  const s = newSlide();
  header(s, 'EVALUATION', 'Benchmark: Baseline RAG vs TrustRAG',
    'Four automated attack scenarios exercise the real security code paths — the same filters that run in production.');

  // metric-cards screenshot banner
  const bw = 7.3, bh = bw * 292 / 1440;
  s.addShape('roundRect', { x: 0.46, y: 1.74, w: bw + 0.18, h: bh + 0.18, rectRadius: 0.1, fill: { color: C.card2 }, line: { color: C.line, width: 1 }, shadow: SH() });
  s.addImage({ path: SHOTS + 'evaluation_metrics.png', x: 0.55, y: 1.83, w: bw, h: bh });

  // native scenario table
  s.addText('ATTACK SCENARIO RESULTS', { x: 0.55, y: 2.78, w: 7.0, h: 0.28, fontFace: F.head, fontSize: 11, bold: true, color: C.text, charSpacing: 1.4, margin: 0 });
  const rows = [
    ['Cryptographic tampering', 'VULNERABLE — accepted', 'PROTECTED — quarantined'],
    ['Indirect prompt injection', 'VULNERABLE — passed to LLM', 'PROTECTED — quarantined'],
    ['Knowledge poisoning', 'VULNERABLE — indexed as truth', 'PROTECTED — flagged & blocked'],
    ['Unauthorized access (RBAC)', 'VULNERABLE — no role filtering', 'PROTECTED — blocked by RBAC'],
  ];
  // table header
  const tx = 0.55, tw = 7.3;
  s.addShape('roundRect', { x: tx, y: 3.1, w: tw, h: 0.36, rectRadius: 0.05, fill: { color: C.card2 }, line: { color: C.line, width: 1 } });
  s.addText('SCENARIO', { x: tx + 0.14, y: 3.1, w: 2.6, h: 0.36, valign: 'middle', fontFace: F.head, fontSize: 8.5, bold: true, color: C.muted, charSpacing: 1, margin: 0 });
  s.addText('BASELINE RAG', { x: tx + 2.7, y: 3.1, w: 2.3, h: 0.36, valign: 'middle', fontFace: F.head, fontSize: 8.5, bold: true, color: C.red, charSpacing: 1, margin: 0 });
  s.addText('TRUSTRAG', { x: tx + 5.05, y: 3.1, w: 2.1, h: 0.36, valign: 'middle', fontFace: F.head, fontSize: 8.5, bold: true, color: C.green, charSpacing: 1, margin: 0 });
  rows.forEach((r, i) => {
    const y = 3.52 + i * 0.62;
    s.addShape('roundRect', { x: tx, y, w: tw, h: 0.56, rectRadius: 0.05, fill: { color: i % 2 ? C.card2 : C.card }, line: { color: C.line, width: 1 } });
    s.addText(r[0], { x: tx + 0.14, y, w: 2.6, h: 0.56, valign: 'middle', fontFace: F.head, fontSize: 9.5, bold: true, color: C.text, margin: 0 });
    s.addText(r[1], { x: tx + 2.7, y, w: 2.35, h: 0.56, valign: 'middle', fontFace: F.body, fontSize: 8.6, color: C.red, margin: 0 });
    s.addText(r[2], { x: tx + 5.05, y, w: 2.15, h: 0.56, valign: 'middle', fontFace: F.body, fontSize: 8.6, color: C.green, margin: 0 });
  });

  // right: stat callouts
  const stats = [
    { v: '4/4', l: 'TrustRAG component checks', d: 'synthetic checks passed; not end-to-end efficacy', c: C.green },
    { v: '0/4', l: 'Baseline control assumptions', d: 'unfiltered-control assumptions, not measured attacks', c: C.red },
    { v: 'n/a', l: 'Suite duration only', d: 'check runtime, not pipeline latency overhead', c: C.blue },
  ];
  stats.forEach((st, i) => {
    const y = 1.8 + i * 1.28;
    card(s, 8.15, y, 4.62, 1.14, { fill: C.card, line: { color: st.c, width: 1.2, transparency: 45 } });
    s.addText(st.v, { x: 8.35, y: y + 0.1, w: 1.7, h: 0.78, valign: 'middle', fontFace: F.head, fontSize: 34, bold: true, color: st.c, margin: 0 });
    s.addText(st.l, { x: 10.05, y: y + 0.14, w: 2.6, h: 0.28, fontFace: F.head, fontSize: 10.5, bold: true, color: C.text, margin: 0 });
    s.addText(st.d, { x: 10.05, y: y + 0.44, w: 2.6, h: 0.56, fontFace: F.body, fontSize: 8.8, color: C.muted, margin: 0 });
  });

  card(s, 8.15, 5.66, 4.62, 1.28, { fill: C.card2, line: { color: C.line, width: 1 } });
  icon(s, 'zap', 'teal', 8.37, 5.86, 0.3);
  s.addText('Synthetic checks, not efficacy claims', { x: 8.77, y: 5.84, w: 3.8, h: 0.28, fontFace: F.head, fontSize: 10.5, bold: true, color: C.text, margin: 0 });
  s.addText('Pass counts from /evaluation/run component checks — baseline is an unfiltered-control assumption. Suite duration is check runtime, not latency overhead.', { x: 8.37, y: 6.16, w: 4.2, h: 0.7, fontFace: F.body, fontSize: 8.8, color: C.muted, margin: 0 });

  s.addNotes('Synthetic result: 4 of 4 component checks passed vs unfiltered-control assumptions. Suite duration is check runtime, not RAG latency overhead. Re-runnable live from the UI; not a measured end-to-end LLM attack experiment.');
})();

/* ============================================================ */
/* SLIDE 10 — ADVANTAGES & FUTURE SCOPE                          */
/* ============================================================ */
(function s10() {
  const s = newSlide();
  header(s, 'OUTLOOK', 'Advantages & Future Scope');

  // LEFT — advantages
  card(s, 0.55, 1.78, 6.0, 4.66, { fill: C.card, line: { color: C.green, width: 1.2, transparency: 45 } });
  s.addShape('ellipse', { x: 0.8, y: 2.0, w: 0.44, h: 0.44, fill: { color: C.green, transparency: 84 }, line: { color: C.green, width: 1 } });
  icon(s, 'check', 'green', 0.9, 2.1, 0.24);
  s.addText('ADVANTAGES', { x: 1.38, y: 2.02, w: 3.5, h: 0.4, valign: 'middle', fontFace: F.head, fontSize: 13, bold: true, color: C.green, charSpacing: 1.6, margin: 0 });

  const adv = [
    'Security shifted left of the LLM — malicious content is blocked before generation, not after.',
    'Defense in depth — four independent checkpoints; no single point of trust.',
    'Tamper-evident audit trail — Ed25519 + SHA-256 + atomic provenance log.',
    'Least-privilege retrieval — RBAC clearance enforced per chunk at query time.',
    'Data sovereignty — local 768-d embeddings; document text never leaves the enterprise.',
    'Fail-closed by design — unverified or tampered content is quarantined, never silently used.',
  ];
  adv.forEach((a, i) => {
    const y = 2.62 + i * 0.63;
    s.addShape('ellipse', { x: 0.84, y: y + 0.05, w: 0.16, h: 0.16, fill: { color: C.green }, line: { type: 'none' } });
    s.addText(a, { x: 1.14, y, w: 5.2, h: 0.56, fontFace: F.body, fontSize: 10, color: C.text, margin: 0, valign: 'top' });
  });

  // RIGHT — future scope
  card(s, 6.78, 1.78, 6.0, 4.66, { fill: C.card, line: { color: C.blue, width: 1.2, transparency: 45 } });
  s.addShape('ellipse', { x: 7.03, y: 2.0, w: 0.44, h: 0.44, fill: { color: C.blue, transparency: 84 }, line: { color: C.blue, width: 1 } });
  icon(s, 'rocket', 'blue', 7.13, 2.1, 0.24);
  s.addText('FUTURE SCOPE', { x: 7.61, y: 2.02, w: 3.5, h: 0.4, valign: 'middle', fontFace: F.head, fontSize: 13, bold: true, color: C.blue, charSpacing: 1.6, margin: 0 });

  const fut = [
    'ML classifiers for injection & poisoning, replacing heuristic regex pattern rules.',
    'Enterprise PKI with HSM-backed keys, rotation, and delegated signing.',
    'Document versioning with signed, chained provenance records.',
    'PII scrubbing and differential privacy for confidential corpora.',
    'Async streaming ingestion and corpus-scale evaluation (RAGAS-style metrics).',
    'Attribute-based access control (ABAC) and policy-as-code enforcement.',
  ];
  fut.forEach((a, i) => {
    const y = 2.62 + i * 0.63;
    s.addShape('ellipse', { x: 7.07, y: y + 0.05, w: 0.16, h: 0.16, fill: { color: C.blue }, line: { type: 'none' } });
    s.addText(a, { x: 7.37, y, w: 5.2, h: 0.56, fontFace: F.body, fontSize: 10, color: C.text, margin: 0, valign: 'top' });
  });

  // closing banner
  s.addShape('roundRect', { x: 0.55, y: 6.6, w: 12.23, h: 0.62, rectRadius: 0.07, fill: { color: C.teal, transparency: 88 }, line: { color: C.teal, width: 1.2 }, shadow: SH() });
  icon(s, 'shield', 'teal', 0.85, 6.74, 0.34);
  s.addText('TrustRAG makes retrieval a security decision — not just a similarity search.', { x: 1.35, y: 6.6, w: 11.2, h: 0.62, valign: 'middle', fontFace: F.head, fontSize: 14, bold: true, color: C.teal, margin: 0 });

  s.addNotes('Advantages: what the architecture buys today. Future scope: honest, realistic next steps — the current detectors are heuristic regex, so ML classifiers and real PKI are the natural maturation path. Closing line: retrieval is a security decision.');
})();

/* ============================================================ */
pres.writeFile({ fileName: '/home/pavan/TrustRAG/ppt_assets/TrustRAG.pptx' }).then(() => {
  console.log('WROTE /home/pavan/TrustRAG/ppt_assets/TrustRAG.pptx');
});
