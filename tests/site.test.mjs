import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

export const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
export const navOf = (html) => (html.match(/<header class="site-nav"[^>]*>[\s\S]*?<\/header>/) || [''])[0];

test('index.html is a full document that uses the shared stylesheet', () => {
  assert.ok(existsSync(new URL('../styles.css', import.meta.url)), 'styles.css exists');
  const html = read('index.html');
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<link rel="stylesheet" href="styles.css">/);
  assert.doesNotMatch(html, /<style>/, 'no inline style block left');
});

test('styles.css keeps the design tokens', () => {
  const css = read('styles.css');
  for (const token of ['--heading:', '--accent:', "--font-display:'Archivo'", "--font-body:'Inter'"]) {
    assert.ok(css.includes(token), `missing ${token}`);
  }
});

export function assertNav(html, current) {
  const nav = navOf(html);
  // The wordmark always lands at the top of the home page, even when already on it (a bare index.html
  // link reloads and restores the scroll position instead).
  assert.match(nav, /<a class="wordmark" href="index.html#top">H. Gravino<\/a>/);
  // #top is an empty marker at y=0, first thing in <body>. Not the sticky header (it scrolls to wherever the
  // header is stuck) and not <body> (taller than the viewport, so scroll-padding only nudges it by 80-120px).
  assert.match(html, /<body>\s*<div id="top"><\/div>\s*<header class="site-nav">/);
  const links = [...nav.matchAll(/<li><a href="([^"]+)"([^>]*)>([^<]+)<\/a><\/li>/g)]
    .map(([, href, attrs, label]) => ({ href, label, current: attrs.includes('aria-current="page"') }));
  assert.deepEqual(links.map((l) => [l.label, l.href]), [
    ['Work', 'index.html#work'], ['Resume', 'resume.html'], ['Contact', 'contact.html'],
  ]);
  assert.deepEqual(links.filter((l) => l.current).map((l) => l.label), current ? [current] : []);
}

test('home page nav', () => assertNav(read('index.html'), null));

test('home page keeps hero, work and certifications only', () => {
  const html = read('index.html');
  for (const id of ['work', 'certifications']) assert.match(html, new RegExp(`id="${id}"`));
  for (const gone of ['id="expertise"', 'id="contact"', 'class="wrap career"', 'Location']) {
    assert.ok(!html.includes(gone), `should not contain ${gone}`);
  }
  assert.match(html, /<a class="btn btn-primary" href="#work">View Work<\/a>/);
  assert.match(html, /<a class="btn btn-ghost" href="contact.html">Discuss a Project<\/a>/);
});

test('resume page', () => {
  const html = read('resume.html');
  assert.match(html, /<link rel="stylesheet" href="styles.css">/);
  assertNav(html, 'Resume');
  for (const heading of ['Career', 'Education', 'Expertise']) {
    assert.match(html, new RegExp(`<h2 class="section-title">${heading}</h2>`));
  }
  assert.match(html, /Senterprisys Limited/);
  assert.match(html, /Codes and compliance/);
});

test('contact page', () => {
  const html = read('contact.html');
  assert.match(html, /<link rel="stylesheet" href="styles.css">/);
  assertNav(html, 'Contact');
  const rows = [...html.matchAll(/<span class="k">[\s\S]*?<span class="k-label">([^<]+)<\/span><\/span>/g)].map((m) => m[1]);
  assert.deepEqual(rows, ['Email', 'Phone', 'LinkedIn']);
  assert.match(html, /<form id="contact-form" action="https:\/\/api.web3forms.com\/submit" method="POST"/);
  assert.match(html, /name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY"/);
  for (const [id, required] of [['cf-name', true], ['cf-email', true], ['cf-subject', true], ['cf-message', true]]) {
    assert.match(html, new RegExp(`<label for="${id}"`), `label for ${id}`);
    const field = html.match(new RegExp(`<(input|select|textarea)[^>]*id="${id}"[^>]*>`));
    assert.ok(field, `field ${id}`);
    assert.equal(/\brequired\b/.test(field[0]), required, `${id} required=${required}`);
  }
  assert.match(html, /id="cf-status"[^>]*role="status"/);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(script.indexOf('YOUR_WEB3FORMS_ACCESS_KEY') < script.indexOf('fetch('), 'placeholder check runs before fetch');
  assert.match(html, /<input id="cf-subject" name="enquiry_subject" type="text"/, 'subject is a text input');
  assert.ok(!html.includes('<select'), 'no dropdown left');
  assert.match(script, /form\.subject\.value = 'Portfolio enquiry: ' \+ /, 'email subject line uses the visitor subject');
  assert.ok(script.indexOf("'Portfolio enquiry: '") < script.indexOf('fetch('), 'subject set before sending');
});

test('contact form has no company field', () => {
  const html = read('contact.html');
  assert.ok(!html.includes('cf-company'), 'company field removed');
  assert.ok(!/name="company"/.test(html), 'no company input');
});

test('contact details have icons, copy buttons and a LinkedIn link', () => {
  const html = read('contact.html');
  const lines = html.match(/<div class="contact-lines">([\s\S]*?)<p class="sr-only" id="c-copy-status"/);
  assert.ok(lines, 'copy status region follows the contact lines');
  const icons = [...lines[1].matchAll(/<svg class="c-icon"[^>]*>/g)];
  assert.equal(icons.length, 3, 'one icon per row');
  for (const [tag] of icons) assert.match(tag, /aria-hidden="true"/);
  assert.match(html, /id="c-copy-status"[^>]*role="status"/);

  const copies = [...lines[1].matchAll(/<button class="c-row c-action" type="button" data-copy="([^"]+)"[^>]*>/g)].map((m) => m[1]);
  assert.deepEqual(copies, ['hcbgravino@gmail.com', '+639620723288']);
  assert.match(lines[1], /\+63 962 072 3288/, 'phone shown in readable groups');

  const li = lines[1].match(/<a class="c-row c-action"[^>]*>/);
  assert.ok(li, 'LinkedIn row is a link');
  assert.match(li[0], /href="https:\/\/www\.linkedin\.com\/"/);
  assert.match(li[0], /target="_blank"/);
  assert.match(li[0], /rel="noopener noreferrer"/);

  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  assert.match(scripts, /navigator\.clipboard\.writeText/);
  assert.match(scripts, /execCommand\('copy'\)/, 'fallback for blocked clipboard');
  assert.match(scripts, /Copied/);

  const css = read('styles.css');
  assert.match(css, /prefers-reduced-motion: reduce\)[\s\S]*?\.c-icon/, 'reduced motion handled for icons');
});

test('contact rows: burgundy tile on hover, check-mark pop on copy', () => {
  const html = read('contact.html');
  const css = read('styles.css');
  const rows = [...html.matchAll(/<(?:button|a) class="c-row c-action"[\s\S]*?<\/(?:button|a)>/g)].map((m) => m[0]);
  assert.equal(rows.length, 3);
  for (const row of rows) assert.match(row, /<span class="c-badge"><svg class="c-icon"/, 'icon sits in a badge');
  rows.slice(0, 2).forEach((row) => assert.match(row, /<svg class="c-check" viewBox="0 0 24 24" aria-hidden="true"><path pathLength="1"/, 'copy rows carry a drawable check'));
  assert.ok(!rows[2].includes('c-check'), 'LinkedIn has nothing to copy');
  assert.match(rows[2], /<span class="c-arrow">&#8599;<\/span>/);

  // Tile grows from the left like the case-number divider, with the same snappy ease-out.
  // The tile covers the icon and its label together.
  assert.match(css, /\n\.c-action \.k::before\{[^}]*background:var\(--accent\)[^}]*clip-path:inset\(0 100% 0 0 round 4px\)[^}]*transition:clip-path 180ms cubic-bezier\(0\.2, 0, 0, 1\)/);
  assert.match(css, /\n\.c-action \.k\{[^}]*position:relative[^}]*width:fit-content/, 'tile hugs icon + label');
  assert.match(css, /\.c-action:hover \.k::before[^{]*\{clip-path:inset\(0 round 4px\);\}/, 'corners stay rounded (4px) throughout the reveal');
  assert.match(css, /\.c-action:hover \.c-icon, [^{]*\.c-action:hover \.k-label[^{]*\{color:var\(--accent-on\);\}/, 'icon and label turn white on the tile');
  assert.ok(!css.includes('.c-badge::before'), 'no separate icon-only tile');
  assert.match(css, /\.c-action:hover \.c-arrow[^{]*\{transform:translate\(2px, -2px\);\}/);
  // Copy: icon swaps to a check that draws in with the tab-pop overshoot; the hint rises in.
  assert.match(css, /\.c-action\.is-copied \.c-badge\{animation:c-pop 260ms cubic-bezier\(0\.34, 1\.56, 0\.64, 1\);\}/);
  assert.match(css, /\.c-action\.is-copied \.c-check path\{animation:c-draw 220ms/);
  assert.match(css, /\.c-action\.is-copied \.c-hint\{[^}]*animation:c-rise/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{[^@]*\.c-action \.k::before[^@]*animation:none/, 'no motion when reduced');

  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('data-copy'));
  assert.match(script, /void row\.offsetWidth/, 'replays the pop on repeat clicks');
});

test('hero line art is decorative and outside the headline', () => {
  const html = read('index.html');
  const stage = html.match(/<div class="hero-stage">([\s\S]*?)<div class="hero-photo">/);
  assert.ok(stage, 'hero-stage wraps the hero');
  const svgs = [...stage[1].matchAll(/<svg class="hero-art hero-art--(left|right)"[^>]*>/g)];
  assert.deepEqual(svgs.map((m) => m[1]), ['left', 'right']);
  for (const [tag] of svgs) assert.match(tag, /aria-hidden="true"/);
  const h1 = stage[1].match(/<h1>[\s\S]*?<\/h1>/)[0];
  assert.ok(!h1.includes('<svg'), 'svgs are not inside the headline');
});

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (rgb) => {
  const [r, g, b] = rgb.map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const token = (css, name) => css.match(new RegExp(`${name}:(#[0-9A-Fa-f]{6})`))[1];
const BAND = () => hex(token(read('styles.css'), '--band'));

test('form field borders meet 3:1 against the dark band', () => {
  const css = read('styles.css');
  const rule = css.match(/\.field input, \.field textarea\{[^}]*border:1px solid ([^;]+);/)[1];
  let border;
  const rgba = rule.match(/rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/);
  if (rgba) border = BAND().map((c) => Math.round(c + (255 - c) * Number(rgba[1])));
  else border = hex(token(css, rule.replace(/var\(|\)/g, '')));
  assert.ok(contrast(border, BAND()) >= 3, `border contrast ${contrast(border, BAND()).toFixed(2)}`);
});

test('primary button hover stays visible on the dark band', () => {
  const css = read('styles.css');
  const rule = css.match(/\.band \.btn-primary:hover\{([^}]*)\}/);
  assert.ok(rule, 'band hover rule exists');
  const bg = rule[1].match(/background:var\((--[\w-]+)\)/)[1];
  assert.ok(contrast(hex(token(css, bg)), BAND()) >= 3);
});

test('anchor targets clear the sticky nav', () => {
  assert.match(read('styles.css'), /html\{[^}]*scroll-padding-top:/);
});

test('footer repeats the nav links plus back to top on every page', () => {
  for (const [page, current] of [['index.html', null], ['resume.html', 'Resume'], ['contact.html', 'Contact']]) {
    const foot = (read(page).match(/<footer class="site-foot[^"]*">[\s\S]*?<\/footer>/) || [''])[0];
    assert.match(foot, /&copy; Hanny Creselle B\. Gravino &middot; Civil Engineer &amp; Project Manager/, `${page} copyright`);
    assert.ok(!foot.includes('wordmark'), `${page} footer has no wordmark`);
    const links = [...foot.matchAll(/<li><a href="([^"]+)"([^>]*)>([^<]+)<\/a><\/li>/g)]
      .map(([, href, attrs, label]) => ({ href, label, current: attrs.includes('aria-current="page"') }));
    assert.deepEqual(links.map((l) => [l.label, l.href]), [
      ['Work', 'index.html#work'], ['Resume', 'resume.html'], ['Contact', 'contact.html'], ['Back to top', '#top'],
    ], page);
    assert.deepEqual(links.filter((l) => l.current).map((l) => l.label), current ? [current] : [], `${page} current`);
  }
});

test('resume page offers the CV download right below the headshot', () => {
  const html = read('resume.html');
  const side = html.match(/<div class="career-side">([\s\S]*?)\n    <\/div>\n  <\/div>/);
  assert.ok(side, 'right-hand column found');
  const block = side[1];
  assert.ok(block.indexOf('headshot') < block.indexOf('Download CV'), 'button sits under the headshot');
  assert.ok(!html.slice(html.indexOf('class="resume-tabs"'), html.indexOf('<div class="career-side">')).includes('Download CV'), 'left column is free of the button');
  const link = block.match(/<a class="btn btn-primary" href="([^"]+)" download="([^"]+)"[^>]*>Download CV<\/a>/);
  assert.ok(link, 'Download CV button in the right-hand column');
  assert.equal(link[2], 'Hanny-Gravino-CV.pdf');
  assert.ok(existsSync(new URL(`../${link[1]}`, import.meta.url)), `${link[1]} exists`);
  assert.match(block, /PDF &middot; \d+ KB/);
});

test('stats read as a divided grid with no accent bars', () => {
  const css = read('styles.css');
  const stat = css.match(/\n\.stat\{([^}]*)\}/)[1];
  assert.ok(!/border-top/.test(stat), 'no burgundy bar on top of each stat');
  const stats = css.match(/\n\.stats\{([^}]*)\}/)[1];
  assert.match(stats, /gap:1px/, 'hairline gaps between cells');
});

test('band contains its children margins (no light gap above the stats)', () => {
  const band = read('styles.css').match(/\n\.band\{([^}]*)\}/)[1];
  assert.match(band, /display:flow-root/);
});

test('each case shows short problem/approach/result that expand in place', () => {
  const html = read('index.html');
  const work = html.match(/<section class="block work" id="work">[\s\S]*?<\/section>/);
  assert.ok(work, 'work section uses the editorial layout');
  const cases = [...work[0].matchAll(/<article class="case">([\s\S]*?)<\/article>/g)].map((m) => m[1]);
  assert.equal(cases.length, 3);
  cases.forEach((c, i) => {
    assert.match(c, new RegExp(`<span class="case-num" aria-hidden="true">0${i + 1}</span>`));
    assert.match(c, /<h3>[^<]+<\/h3>/);
    const id = `case-${i + 1}-story`;
    assert.match(c, new RegExp(`<div class="case-story" id="${id}">`), `${id} region`);
    for (const term of ['Problem', 'Approach', 'Result']) {
      const row = c.match(new RegExp(`<dt>${term}</dt>\\s*<dd>([\\s\\S]*?)</dd>`));
      assert.ok(row, `${term} row in case ${i + 1}`);
      const short = row[1].match(/<span class="story-short">([^<]+)<\/span>/);
      const long = row[1].match(/<span class="story-long" hidden>([\s\S]+?)<\/span>/);
      assert.ok(short && long, `${term} has short and hidden long text`);
      assert.ok(long[1].length > short[1].length, `${term} long text is longer than short`);
    }
    assert.match(c, /<p class="case-tools" hidden>/);
    assert.match(c, new RegExp(`<button class="case-toggle" type="button" aria-expanded="false" aria-controls="${id}" hidden>Read the case</button>`));
    assert.ok(!c.includes('<details'), 'no separate expanding block below');
    assert.ok(!c.includes('case-outcome'), 'outcome sentence replaced by the short rows');
  });
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script, 'toggle script present');
  for (const needle of ['.case-toggle', 'aria-expanded', '.story-short', '.story-long', '.case-tools', 'prefers-reduced-motion']) {
    assert.ok(script[1].includes(needle), `script handles ${needle}`);
  }
  assert.match(script[1], /setTimeout\(\(\) => animation\.cancel\(\)/, 'a stalled height animation is cancelled so text is never left clipped');
});

const cssRule = (css, sel) => {
  const start = css.indexOf('\n' + sel + '{');
  return start < 0 ? '' : css.slice(start + sel.length + 2, css.indexOf('}', start));
};

test('selected work keeps photos on the left with no stray lines', () => {
  const css = read('styles.css');
  assert.match(cssRule(css, 'section.work'), /border-top:none/);
  for (const sel of ['.case', '.case-photo', '.case-toggle']) {
    assert.ok(cssRule(css, sel), `${sel} rule exists`);
    assert.ok(!/border(-top|-bottom)?:\s*[1-9]/.test(cssRule(css, sel)), `${sel} has no border line`);
  }
  assert.ok(!/nth-child\(even\)[^{]*\.case-media/.test(css), 'no alternating image sides');
  assert.match(cssRule(css, '.case'), /align-items:start/, 'photo stays at the top when a case is expanded');
});

test('case numbers are burgundy and figures sit under a hairline', () => {
  const css = read('styles.css');
  assert.match(cssRule(css, '.case-num'), /color:var\(--accent-text\)/);
  assert.match(cssRule(css, '.case-figures'), /border-top:1px solid var\(--rule\)/);
});

test('section titles have no accent bar above them', () => {
  assert.ok(!read('styles.css').includes('.section-title::before'));
});

test('read the case is a filled button with readable burgundy text', () => {
  const css = read('styles.css');
  const btn = cssRule(css, '.case-toggle');
  assert.match(btn, /background:var\(--button-soft\)/, 'filled with the soft button grey');
  assert.match(btn, /color:var\(--accent-text\)/, 'burgundy label');
  assert.match(btn, /padding:12px 20px/);
  assert.match(btn, /min-height:44px/);
  assert.match(cssRule(css, '.case-toggle:hover'), /background:var\(--button-soft-hover\)/);
  const burgundy = hex(token(css, '--accent-text'));
  for (const fill of ['--button-soft', '--button-soft-hover']) {
    const ratio = contrast(burgundy, hex(token(css, fill)));
    assert.ok(ratio >= 4.5, `${fill} text contrast ${ratio.toFixed(2)}`);
  }
  assert.ok(contrast(hex(token(css, '--button-soft')), hex(token(css, '--bg'))) > 1.2, 'fill is visibly darker than the page');
});

test('band under the hero photo lists qualifications, not numbers', () => {
  const html = read('index.html');
  const band = html.match(/<div class="wrap quals"><ul class="stats" aria-label="Qualifications">([\s\S]*?)<\/ul><\/div>/);
  assert.ok(band, 'qualifications table in the graphite band');
  assert.ok(html.indexOf('class="hero-photo"') < html.indexOf('aria-label="Qualifications"'), 'band stays under the large photo');
  const items = [...band[1].matchAll(/<li class="stat"><div class="num">([^<]+)<\/div><div class="cap">([^<]+)<\/div><\/li>/g)]
    .map(([, title, cap]) => [title.replace('&amp;', '&'), cap.replace(/&amp;/g, '&')]);
  assert.deepEqual(items.map(([t]) => t), ['PMP', 'MIEAust', 'Structural Designer & Engineer', 'Estimator', 'Project Coordinator']);
  assert.deepEqual(items.map(([, c]) => c), [
    'Project Management Professional, certified by PMI. Plans schedules, procurement and cost control with Gantt charts and S-curves.',
    'Member of Engineers Australia, the professional body for engineers practising in Australia.',
    'Seismic-resistant design and retrofit in ETABS, VisualFoundation and AutoCAD, Digos City, Philippines, 2020 to 2023.',
    'Housing estimator and estimating software support at Senterprisys Limited, Queensland, since 2023. Cost estimates, BOQ and BOM.',
    'Coordinated architects, contractors and suppliers through construction at WMCabardo Engineering and ADRA Constructions.',
  ]);
  for (const gone of ['3,000 m&sup2;</div>', '6 storeys', '2 countries']) assert.ok(!band[1].includes(gone), `no old stat ${gone}`);
});

test('qualifications grid leaves no empty cells at any breakpoint', () => {
  const css = read('styles.css');
  assert.match(cssRule(css, '.stats'), /grid-template-columns:repeat\(5, 1fr\)/);
  assert.match(css, /@media \(max-width:1024px\)\{[^}]*\.stats\{grid-template-columns:repeat\(6, 1fr\);\}[^}]*\}/);
  assert.match(css, /\.stat\{grid-column:span 2;\}\s*\.stat:nth-child\(n\+4\)\{grid-column:span 3;\}/);
});

test('qualifications stack one per row below 640px so long titles are not squeezed', () => {
  assert.match(read('styles.css'), /@media \(max-width:640px\)\{\.stats\{grid-template-columns:1fr;/);
});

test('band tables are closed frames with small rounded outer corners', () => {
  const css = read('styles.css');
  const stats = cssRule(css, '.stats');
  assert.match(stats, /border:1px solid var\(--band-line\)/, '.stats has a closed frame');
  for (const grid of ['.stats', '.cred-grid']) {
    assert.match(cssRule(css, grid), /border-radius:6px/, `${grid} has tight rounded outer corners`);
  }
  assert.ok(!css.includes('.quals::before'), 'no extended top and bottom rules any more');
  assert.ok(!css.includes('.cred-table::before'), 'no extended rules on the certifications table');
  assert.ok(!/background-clip/.test(stats), 'no side padding trick needed any more');
  // Dividers are drawn on each cell's left and top edge and clipped at the table edge, so sub-pixel
  // rounding can never expose a stray line down the right side.
  for (const [grid, cell, line] of [['.stats', '.stat', '--band-line'], ['.cred-grid', '.cred-cell', '--card-line']]) {
    assert.ok(!/background:var\(--band-line\)/.test(cssRule(css, grid)), `${grid} has no line-coloured background`);
    assert.match(cssRule(css, grid), /overflow:hidden/, `${grid} clips edge dividers`);
    assert.match(cssRule(css, cell), new RegExp(`box-shadow:-1px 0 0 var\\(${line}\\), 0 -1px 0 var\\(${line}\\)`), `${cell} draws left and top dividers`);
  }
  assert.match(cssRule(css, '.stat .num'), /font-size:18px/);
});

test('qualification titles share a top line and descriptions start on one shared line', () => {
  const css = read('styles.css');
  const stat = cssRule(css, '.stat');
  assert.match(stat, /display:grid/);
  assert.match(stat, /grid-row:span 2/);
  assert.match(stat, /grid-template-rows:subgrid/, 'titles in a row share one height so descriptions align');
  assert.ok(!/text-align:center/.test(stat), 'text stays left-aligned as before');
  assert.match(cssRule(css, '.stat .num'), /align-self:start/, 'titles share one top line');
});

test('home certifications sit on the graphite band and each opens its certificate', () => {
  const html = read('index.html');
  const section = html.match(/<section class="band creds-band" id="certifications">[\s\S]*?<\/section>/);
  assert.ok(section, 'certifications section on the graphite band');
  assert.match(section[0], /<h2 class="section-title">Certifications and Memberships<\/h2>/);
  const cells = [...section[0].matchAll(/<li class="cred-cell"><a class="cred-open" href="(assets\/certificates\/[a-z-]+\.jpg)" data-title="([^"]+)" aria-haspopup="dialog"><span class="cred-logo"><img src="assets\/issuers\/[a-z-]+\.png" alt="" width="\d+" height="\d+"><\/span><span class="cred-title">([^<]+)<\/span><span class="cred-desc">([^<]+)<\/span><span class="cred-view">View certificate<\/span><\/a><\/li>/g)]
    .map(([, href, dataTitle, title, desc]) => ({ href, dataTitle, title, desc: desc.replace(/&middot;/g, '·') }));
  // PMI credentials share the top row; engineering memberships sit below.
  assert.deepEqual(cells.map((c) => c.title), ['PMP', 'CAPM', 'PMI Member', 'MIEAust', 'MIET', 'M.ASCE']);
  assert.deepEqual(cells.map((c) => c.desc), [
    'Project Management Professional, Project Management Institute · 2026',
    'Certified Associate in Project Management, Project Management Institute · 2025',
    'Project Management Institute, Queensland Australia Chapter · 2025',
    'Member, Engineers Australia · 2025',
    'Member, Institution of Engineering and Technology · 2025',
    'Member, American Society of Civil Engineers · 2025',
  ]);
  for (const c of cells) assert.ok(existsSync(new URL(`../${c.href}`, import.meta.url)), `${c.href} exists`);
  for (const notHere of ['placeholder', 'PRC', 'Diploma', 'White Card', 'MIDAS', 'PICE']) {
    assert.ok(!section[0].includes(notHere), `home certifications should not include ${notHere}`);
  }
});

test('each certification stacks its issuer logo above the title, like the Education tab', () => {
  const html = read('index.html');
  const section = html.match(/<section class="band creds-band" id="certifications">[\s\S]*?<\/section>/)[0];
  const logos = [...section.matchAll(/<span class="cred-logo"><img src="(assets\/issuers\/[a-z-]+\.png)" alt=""/g)].map((m) => m[1]);
  assert.deepEqual(logos, [
    'assets/issuers/pmi.png', 'assets/issuers/pmi.png', 'assets/issuers/pmi.png',
    'assets/issuers/engineers-australia.png', 'assets/issuers/iet.png', 'assets/issuers/asce.png',
  ]);
  for (const src of new Set(logos)) assert.ok(existsSync(new URL(`../${src}`, import.meta.url)), `${src} exists`);
  const css = read('styles.css');
  // Same stack as the school logos: 48px mark, left-aligned, then the title; the title gets the full width.
  assert.ok(!section.includes('cred-head'), 'no shared title/logo row');
  assert.match(css, /--cred-logo:48px;/);
  assert.match(cssRule(css, '.t-logo'), /width:48px; height:48px/, 'matches the Education logo size');
  // On the white cards the symbols sit directly on the card, left-aligned in a 48px row: no disc or tile.
  const logo = cssRule(css, '.cred-logo');
  assert.match(logo, /height:var\(--cred-logo\)/);
  assert.match(logo, /align-items:center/);
  assert.ok(!/background|border-radius/.test(logo), 'no tile behind the logo');
  assert.ok(!/margin/.test(logo), 'logo is not nudged with margins');
});

test('certification cards are white with dark text and a burgundy link', () => {
  const css = read('styles.css');
  assert.match(css, /--card:#FFFFFF;/);
  assert.match(cssRule(css, '.cred-cell'), /background:var\(--card\)/);
  // Third shadow fills the 1px corner where dividers cross, or the graphite band shows through as a dot.
  assert.match(cssRule(css, '.cred-cell'), /box-shadow:-1px 0 0 var\(--card-line\), 0 -1px 0 var\(--card-line\), -1px -1px 0 var\(--card-line\)/);
  assert.match(cssRule(css, '.cred-open'), /color:var\(--heading\)/);
  assert.match(cssRule(css, '.cred-desc'), /color:var\(--ink-muted\)/);
  assert.match(cssRule(css, '.cred-view'), /color:var\(--accent-text\)/);
  const card = hex(token(css, '--card'));
  for (const t of ['--heading', '--ink-muted', '--accent-text']) {
    const ratio = contrast(hex(token(css, t)), card);
    assert.ok(ratio >= 4.5, `${t} on white: ${ratio.toFixed(2)}`);
  }
});

test('certificate pop-up is an accessible dialog', () => {
  const html = read('index.html');
  assert.match(html, /<dialog class="cert-dialog" aria-labelledby="cert-dialog-title">/);
  assert.match(html, /<h3 id="cert-dialog-title"><\/h3>/);
  assert.match(html, /<button class="cert-close" type="button" aria-label="Close certificate">/);
  assert.match(html, /<img class="cert-image" alt="" src="" decoding="async">/);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  for (const needle of ['.cred-open', 'showModal', 'preventDefault', 'event.target === dialog', 'opener.focus()']) {
    assert.ok(scripts.includes(needle), `dialog script handles ${needle}`);
  }
  const css = read('styles.css');
  assert.match(cssRule(css, '.cred-grid'), /grid-template-columns:repeat\(3, 1fr\)/);
  assert.match(cssRule(css, '.cert-dialog::backdrop'), /background:/);
  assert.match(cssRule(css, '.cert-image'), /object-fit:contain/);
});

test('resume holds the diploma and the training and CPD list', () => {
  const html = read('resume.html');
  assert.match(html, /<div class="t-date">2024<\/div>\s*<div>\s*(?:<img class="t-logo"[^>]*>\s*)?<div class="t-role">Diploma of Project Management \(BSB50820\)<\/div>\s*<div class="t-org">Canterbury Technical Institute, Brisbane<\/div>/);
  const training = html.match(/<section class="tab-panel" id="training"[^>]*>[\s\S]*?<\/section>/);
  assert.ok(training, 'training panel');
  assert.match(training[0], /<h2 class="section-title">Training and CPD<\/h2>/);
  const rows = [...training[0].matchAll(/<div class="t-date">([^<]+)<\/div>\s*<div>\s*<div class="t-role">([^<]+)<\/div>\s*<div class="t-org">([^<]+)<\/div>/g)].map((m) => m.slice(1));
  assert.deepEqual(rows.map((r) => r[0]), ['Sep 2023', 'Nov 2022', 'Nov 2022', 'Jul 2022', 'Apr 2022', 'Mar 2022']);
  assert.equal(rows.length, 6);
  assert.ok(html.indexOf('id="training"') < html.indexOf('id="expertise"'), 'training sits before expertise');
  assert.ok(!html.includes('PRC'), 'no PRC licence');
});

test('hero line art is structured for draw-in and scroll motion', () => {
  const html = read('index.html');
  const left = html.match(/<svg class="hero-art hero-art--left"[\s\S]*?<\/svg>/)[0];
  const right = html.match(/<svg class="hero-art hero-art--right"[\s\S]*?<\/svg>/)[0];
  for (const cls of ['art-building', 'art-crane', 'art-jib', 'art-hook-line', 'art-hook']) assert.match(left, new RegExp(`class="${cls}"`), `left art has ${cls}`);
  for (const cls of ['art-frame', 'art-truss']) assert.match(right, new RegExp(`class="${cls}"`), `right art has ${cls}`);
  for (const svg of [left, right]) {
    const shapes = [...svg.matchAll(/<(line|rect|polyline|path)\b[^>]*>/g)].map((m) => m[0]);
    assert.ok(shapes.length > 10);
    for (const s of shapes) assert.match(s, /pathLength="1"/, `every stroke can draw in: ${s.slice(0, 40)}`);
  }
  assert.ok(left.indexOf('class="art-jib"') < left.indexOf('class="art-hook-line"'), 'hook swings with the jib');
});

test('hero line art motion respects reduced motion and stays cheap', () => {
  const css = read('styles.css');
  // Undrawn strokes are fully hidden so curved paths can't leave a speck before their turn.
  assert.match(css, /@keyframes art-draw\{from\{stroke-dashoffset:1; stroke-opacity:0;\}\s*1%\{stroke-opacity:1;\}\s*to\{stroke-dashoffset:0;\}\}/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)\{[^@]*\.hero-art \[pathLength\]\{animation:art-draw/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{\s*\.hero-stage\{--p:1;\}\s*\}/, 'reduced motion shows the finished drawing');
  for (const sel of ['.art-jib', '.art-hook-line', '.art-hook', '.art-frame']) {
    assert.match(cssRule(css, sel), /transform:/, `${sel} moves with transform only`);
    assert.ok(!/(^|;)\s*(top|left|width|height):/.test(cssRule(css, sel)), `${sel} does not animate layout`);
  }
  const script = [...read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('.hero-stage'));
  assert.ok(script, 'scroll script present');
  for (const needle of ["prefers-reduced-motion: reduce", 'requestAnimationFrame', 'passive: true', 'IntersectionObserver', "setProperty('--p'"]) {
    assert.ok(script.includes(needle), `scroll script uses ${needle}`);
  }
});

test('building frame grows from the ground so it never sinks below it', () => {
  const frame = cssRule(read('styles.css'), '.art-frame');
  assert.match(frame, /transform-origin:130px 318px/, 'anchored at ground level');
  assert.match(frame, /transform:scaleY\(calc\(0\.94 \+ var\(--p, 0\) \* 0\.06\)\)/);
  assert.ok(!/translateY/.test(frame), 'no downward shift below the ground line');
});

test('line art draws stroke by stroke and finishes in 1.5 seconds', () => {
  const html = read('index.html');
  const css = read('styles.css');
  const seg = Number(css.match(/--art-seg:([\d.]+)s/)[1]);
  for (const side of ['left', 'right']) {
    const svg = html.match(new RegExp(`<svg class="hero-art hero-art--${side}"[^>]*>[\\s\\S]*?</svg>`))[0];
    const step = Number(svg.match(/style="--art-step:([\d.]+)s"/)[1]);
    const indices = [...svg.matchAll(/<(?:line|rect|polyline|path)\b[^>]*style="--i:(\d+)"/g)].map((m) => Number(m[1]));
    const shapes = [...svg.matchAll(/<(?:line|rect|polyline|path)\b/g)].length;
    assert.equal(indices.length, shapes, `${side}: every stroke has its own order index`);
    assert.deepEqual(indices, indices.map((_, i) => i), `${side}: strokes draw in document order`);
    const total = (shapes - 1) * step + seg;
    assert.ok(Math.abs(total - 1.5) < 0.01, `${side}: drawing takes ${total.toFixed(3)}s`);
  }
  assert.match(css, /\.hero-art \[pathLength\]\{animation:art-draw var\(--art-seg\)[^}]*animation-delay:calc\(var\(--i, 0\) \* var\(--art-step\)\)/);
  assert.ok(!css.includes('.art-crane [pathLength]{animation-delay'), 'no blanket group delay any more');
});

test('crane swing is clearly visible but the hook never reaches the roof', () => {
  const css = read('styles.css');
  const angle = Number(cssRule(css, '.art-jib').match(/rotate\(calc\(var\(--p, 0\) \* -([\d.]+)deg\)\)/)[1]);
  assert.ok(angle >= 10, `jib swings ${angle}deg`);
  const hookTravel = Number(cssRule(css, '.art-hook').match(/translateY\(calc\(var\(--p, 0\) \* ([\d.]+)px\)\)/)[1]);
  // Hook tip sits at y=162, 78 units left of the jib pivot (x=190); the building roof is at y=210.
  const hookBottom = 162 + 78 * Math.sin((angle * Math.PI) / 180) + hookTravel;
  assert.ok(hookBottom < 210, `hook bottom ${hookBottom.toFixed(1)} stays above the roof`);
});

test('resume career, education and training sit in accessible tabs', () => {
  const html = read('resume.html');
  const list = html.match(/<div class="tab-list" role="tablist" aria-label="Resume sections" hidden>([\s\S]*?)<\/div>/);
  assert.ok(list, 'tablist starts hidden so the page works without JavaScript');
  const tabs = [...list[1].matchAll(/<button class="tab" type="button" role="tab" id="([^"]+)" aria-controls="([^"]+)" aria-selected="(true|false)" tabindex="(-1|0)">([^<]+)<\/button>/g)]
    .map(([, id, controls, selected, tabindex, label]) => ({ id, controls, selected, tabindex, label }));
  assert.deepEqual(tabs.map((t) => t.label), ['Career', 'Education', 'Training and CPD']);
  assert.deepEqual(tabs.map((t) => t.selected), ['true', 'false', 'false']);
  assert.deepEqual(tabs.map((t) => t.tabindex), ['0', '-1', '-1']);
  for (const t of tabs) {
    const panel = html.match(new RegExp(`<section class="tab-panel" id="${t.controls}" role="tabpanel" aria-labelledby="${t.id}" tabindex="0">([\\s\\S]*?)</section>`));
    assert.ok(panel, `panel for ${t.label}`);
    assert.match(panel[1], /<div class="timeline[ "]/, `${t.label} keeps the timeline`);
  }
  assert.ok(!html.includes('<section class="block" id="training">'), 'training no longer a separate long section');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('[role="tab"]'));
  assert.ok(script, 'tab script present');
  for (const needle of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'aria-selected', '.hidden', 'tabs-ready']) {
    assert.ok(script.includes(needle), `tab script handles ${needle}`);
  }
  const css = read('styles.css');
  assert.match(cssRule(css, '.tab[aria-selected="true"]'), /box-shadow:inset 0 -2px 0 var\(--accent\)/, 'active tab underlined in burgundy like the nav');
  assert.match(cssRule(css, '.tab'), /min-height:var\(--tab-bar-height\)/);
  assert.match(css, /--tab-bar-height:44px;/, 'tabs keep a 44px touch target');
});

test('the hidden attribute always wins over component display rules', () => {
  // Without it, .tab-list and .case-toggle would show as dead controls when JavaScript is off.
  assert.match(read('styles.css'), /\[hidden\]\{display:none !important;\}/);
});

test('resume page has no small label above the tabs', () => {
  const html = read('resume.html');
  const top = html.slice(html.indexOf('<main>'), html.indexOf('class="tab-list"'));
  assert.ok(!top.includes('class="label"'), 'no RESUME label or dash');
});

const timelineScript = () => [...read('resume.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('tl-anim'));

test('timelines fill with burgundy up to the hovered entry', () => {
  const css = read('styles.css');
  assert.match(cssRule(css, '.timeline.tl-anim .t-row::before'), /background:var\(--rule-strong\)/, 'dots start light grey so the burgundy fill stands out');
  assert.match(css, /\.timeline\.tl-anim \.t-row:first-child::before, \.timeline\.tl-anim \.t-row\.is-filled::before\{background:var\(--accent\);\}/, 'first dot starts burgundy; others fill');
  assert.match(cssRule(css, '.timeline.tl-anim::before'), /background:var\(--rule-strong\)/, 'rail starts light grey');
  assert.match(cssRule(css, '.timeline.tl-anim::after'), /height:var\(--fill, 0px\)/, 'burgundy liquid height set by the hovered entry');
  assert.match(cssRule(css, '.timeline.tl-anim::after'), /transition:height var\(--fill-duration\)/, 'liquid flows rather than jumps');
  assert.match(cssRule(css, '.timeline.tl-anim .t-row::before'), /var\(--dot-delay, 0ms\)/, 'each dot lights up as the liquid reaches it');
  const script = timelineScript();
  assert.ok(script, 'timeline fill script present');
  for (const needle of ["prefers-reduced-motion: reduce", "'mouseenter'", "'mouseleave'", "'click'", "setProperty('--fill'", "setProperty('--dot-delay'", "'is-filled'"]) {
    assert.ok(script.includes(needle), `fill script uses ${needle}`);
  }
  assert.ok(!/addEventListener\('scroll'/.test(script), 'no longer driven by scrolling');
});

test('leaving a timeline drains it back to the first dot', () => {
  const script = timelineScript();
  assert.match(script, /addEventListener\('mouseleave', \(\) => fillTo\(tl, 0\)\)/);
});

test('timeline rail is thick enough for the burgundy fill to read', () => {
  const rail = cssRule(read('styles.css'), '.timeline.tl-anim::before, .timeline.tl-anim::after');
  assert.match(rail, /width:2px/);
  assert.match(rail, /left:4\.5px/, 'centred on the 11px dots');
});


test('education timeline lists schooling with school logos', () => {
  const panel = read('resume.html').match(/<section class="tab-panel" id="education"[\s\S]*?<\/section>/)[0];
  assert.ok(!panel.includes('Placeholder'), 'degree placeholder replaced');
  const rows = [...panel.matchAll(/<div class="t-row">\s*<div class="t-date">([^<]+)<\/div>\s*<div>([\s\S]*?)<\/div>\s*<\/div>/g)]
    .map(([, date, body]) => ({ date, logo: (body.match(/<img class="t-logo" src="([^"]+)"/) || [])[1], role: body.match(/<div class="t-role">([^<]+)<\/div>/)[1], org: body.match(/<div class="t-org">([^<]+)/)[1] }));
  assert.deepEqual(rows.map((r) => [r.date, r.role]), [
    ['2024', 'Diploma of Project Management (BSB50820)'],
    ['2014 to 2019', 'BS Civil Engineering'],
    ['2010 to 2014', 'Kapatagan National High School'],
    ['2003 to 2010', 'Rizal Central Elementary School'],
  ]);
  assert.deepEqual(rows.map((r) => r.org.split(' &middot; ')[0]), ['Canterbury Technical Institute, Brisbane', 'Cor Jesu College', 'High school', 'Elementary']);
  assert.deepEqual(rows.map((r) => r.logo), ['assets/schools/cti.png', 'assets/schools/cor-jesu-college.png', 'assets/schools/kapatagan-nhs.png', 'assets/schools/rizal-central-es.png']);
  for (const r of rows.filter((x) => x.logo)) assert.ok(existsSync(new URL(`../${r.logo}`, import.meta.url)), `${r.logo} exists`);
  for (const img of panel.match(/<img class="t-logo"[^>]*>/g)) {
    assert.match(img, /alt=""/, 'logo is decorative: the school name is already in the text');
    assert.match(img, /width="48" height="48"/, 'reserves space so the timeline does not jump');
    assert.match(img, /loading="lazy"/);
  }
  assert.match(cssRule(read('styles.css'), '.t-logo'), /margin-bottom/, 'logo sits above the text');
});

test('resume page opens on the tabs with a screen-reader-only heading', () => {
  const html = read('resume.html');
  assert.ok(!html.includes('class="wrap page-head"'), 'no visible page heading block');
  assert.match(html, /<h1 class="sr-only">Resume of Hanny Gravino<\/h1>/, 'page keeps an h1 for assistive tech and search');
  assert.ok(html.indexOf('<h1') < html.indexOf('class="tab-list"'), 'heading comes first in the document');
  assert.match(cssRule(read('styles.css'), '.sr-only'), /clip-path:inset\(50%\)/);
});

test('headshot top lines up with the tab divider', () => {
  const css = read('styles.css');
  assert.match(css, /--tab-bar-height:44px;/);
  assert.match(cssRule(css, '.career-side'), /margin-top:var\(--tab-bar-height\)/);
  assert.match(cssRule(css, '.tab'), /min-height:var\(--tab-bar-height\)/, 'tab bar height and headshot offset share one value');
});

test('resume expertise uses the table format on the light page background', () => {
  const html = read('resume.html');
  const section = html.match(/<section class="block" id="expertise">[\s\S]*?<\/section>/);
  assert.ok(section, 'expertise is a regular light section with the divider above it');
  assert.ok(!/<section class="band[^"]*" id="expertise">/.test(html), 'no graphite band');
  assert.match(section[0], /<h2 class="section-title">Expertise<\/h2>/);
  const items = [...section[0].matchAll(/<li class="stat"><div class="num">([^<]+)<\/div><div class="cap">([^<]+)<\/div><\/li>/g)].map((m) => m[1]);
  assert.deepEqual(items, ['Structural analysis', 'Seismic and retrofit', 'Project management', 'Codes and compliance', 'Software and platforms']);
  assert.match(section[0], /<div class="quals quals--light"><ul class="stats" aria-label="Expertise">/);
  assert.ok(!html.includes('class="legend'), 'old legend rows removed');
  const css = read('styles.css');
  assert.match(cssRule(css, '.quals--light .stats'), /border-color:var\(--rule\)/, 'light frame');
  assert.match(cssRule(css, '.quals--light .stat'), /background:var\(--bg\)/, 'cells match the page background');
  assert.match(cssRule(css, '.quals--light .stat'), /box-shadow:-1px 0 0 var\(--rule\), 0 -1px 0 var\(--rule\)/, 'light inner dividers');
  assert.match(cssRule(css, '.quals--light .stat .num'), /color:var\(--heading\)/);
  assert.match(cssRule(css, '.quals--light .stat .cap'), /color:var\(--ink-muted\)/);
  assert.match(cssRule(css, 'section.block'), /border-top:1px solid var\(--rule\)/, 'divider between sections');
});

test('tab labels give a small expanding pop when a visitor selects them', () => {
  const css = read('styles.css');
  assert.match(css, /@keyframes tab-pop\{[^}]*transform:scale\(1\)[^}]*\}[^}]*transform:scale\(1\.08\)/, 'label expands then settles');
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)\{[^@]*\.tab\.is-popping\{animation:tab-pop/, 'only when motion is allowed');
  const script = [...read('resume.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('[role="tab"]') && s.includes('select'));
  assert.match(script, /is-popping/, 'script triggers the pop');
  assert.match(script, /animationend/, 'class is cleared so it can replay');
  assert.match(script, /select\(0, false, false\)/, 'no pop on page load');
});

test('case number sits beside the title with a divider between them', () => {
  const html = read('index.html');
  const heads = [...html.matchAll(/<div class="case-head">\s*<span class="case-num" aria-hidden="true">(\d\d)<\/span>\s*<div class="case-heading">\s*<h3>([^<]+)<\/h3>\s*<p class="case-meta">([^<]+)<\/p>\s*<\/div>\s*<\/div>/g)];
  assert.equal(heads.length, 3, 'number, then title, then location and date');
  assert.deepEqual(heads.map((m) => m[1]), ['01', '02', '03']);
  const css = read('styles.css');
  assert.match(cssRule(css, '.case-head'), /display:flex/);
  const divider = cssRule(css, '.case-heading::before');
  assert.match(divider, /right:100%/, 'divider sits at the left edge of the title block');
  assert.match(divider, /clip-path:inset\(0 0 0 calc\(100% - 1px\)\)/, 'closed: only a 1px line shows');
  assert.match(divider, /background:var\(--rule\)/);
});

test('case numbers share one width so the dividers line up', () => {
  const num = cssRule(read('styles.css'), '.case-num');
  assert.match(num, /font-variant-numeric:tabular-nums/);
  assert.match(num, /width:1\.2em/);
});

test('expanded cases turn Problem/Approach/Result into burgundy buttons that grow slightly', () => {
  const css = read('styles.css');
  const open = cssRule(css, '.case-story.is-expanded .story-row dt');
  assert.match(open, /background:var\(--accent\)/);
  assert.match(open, /color:var\(--accent-on\)/, 'white text');
  assert.match(open, /transform:scale\(1\.08\)/, 'label expands a little');
  const dt = cssRule(css, '.story-row dt');
  assert.match(dt, /transform-origin:left center/, 'grows rightward from its left edge');
  assert.match(dt, /transition:/);
  // The widest label (APPROACH, ~77px at 12px) plus 8px padding each side, scaled 1.08, must fit the label column.
  const column = Number(cssRule(css, '.story-row').match(/grid-template-columns:(\d+)px 1fr/)[1]);
  assert.ok((77 + 16) * 1.08 <= column, `expanded label fits the ${column}px column`);
  assert.match(cssRule(css, '.case-tools'), new RegExp(`margin:16px 0 0 ${column + 16}px`), 'tools line stays aligned with the text column');
  assert.ok(!/font-size/.test(open), 'no layout-changing font-size swap; the subtext never moves');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{[^}]*\.story-row dt\{transition:none;\}/);
  const script = [...read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('.case-toggle'));
  assert.match(script, /story\.classList\.toggle\('is-expanded', expand\)/);
});

test('opening a case grows the divider into a burgundy tile and centres the number in white', () => {
  const css = read('styles.css');
  const open = cssRule(css, '.case.is-open .case-heading::before');
  assert.match(open, /clip-path:inset\(0\)/, 'divider expands leftward into a full block');
  assert.match(open, /background:var\(--accent\)/, 'block turns burgundy');
  const openTransition = open.match(/transition:([^;]+)/)[1];
  const colourDelay = Number(openTransition.match(/background-color \d+ms [a-z-]+ (\d+)ms/)[1]);
  const clipDelay = Number((openTransition.match(/clip-path \d+ms cubic-bezier\([^)]*\)\s*(\d+)?/) || [])[1] || 0);
  assert.ok(colourDelay > clipDelay, 'colour change comes after the expansion starts');
  const num = cssRule(css, '.case.is-open .case-num');
  assert.match(num, /color:var\(--accent-on\)/, 'number turns white');
  assert.match(num, /transform:translateX\(10px\)/, 'number moves to the centre of the tile (half the 20px gap)');
  // The number slides in lockstep with the divider: same duration, easing and delay, opening and closing.
  const clipOf = (rule) => cssRule(css, rule).match(/clip-path (\d+ms cubic-bezier\([^)]*\)(?: \d+ms)?)/)[1];
  const moveOf = (rule) => cssRule(css, rule).match(/transform (\d+ms cubic-bezier\([^)]*\)(?: \d+ms)?)/)[1];
  assert.equal(moveOf('.case.is-open .case-num'), clipOf('.case.is-open .case-heading::before'), 'opening: number moves with the divider');
  assert.equal(moveOf('.case-num'), clipOf('.case-heading::before'), 'closing: number moves back with the divider');
  // Snappy: the open sequence (slide + colour) finishes within ~220ms; closing starts almost immediately.
  const ends = (t) => [...t.matchAll(/(\d+)ms(?: [a-z-]+| cubic-bezier\([^)]*\))?(?: (\d+)ms)?/g)].map((m) => Number(m[1]) + Number(m[2] || 0));
  for (const rule of ['.case.is-open .case-heading::before', '.case.is-open .case-num']) {
    assert.ok(Math.max(...ends(cssRule(css, rule).match(/transition:([^;]+)/)[1])) <= 220, `${rule} finishes within 220ms`);
  }
  for (const rule of ['.case-heading::before', '.case-num']) {
    const delays = [...cssRule(css, rule).match(/transition:([^;]+)/)[1].matchAll(/ms(?: [a-z-]+| cubic-bezier\([^)]*\)) (\d+)ms/g)].map((m) => Number(m[1]));
    assert.ok(delays.every((d) => d <= 80), `${rule} closes without a long wait`);
  }
  assert.match(cssRule(css, '.case-num'), /text-align:center/);
  assert.match(cssRule(css, '.case-heading::before'), /width:calc\(var\(--num-size\) \* 1\.2 \+ 20px\)/, 'tile spans the number column plus the gap');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{[^}]*\.case-heading::before, \.case-num\{transition:none;\}/);
  const script = [...read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('.case-toggle'));
  assert.match(script, /button\.closest\('\.case'\)\.classList\.toggle\('is-open', expand\)/);
});

test('case details sit beside the photo and the figures divider starts at the photo bottom', () => {
  const html = read('index.html');
  const bodies = [...html.matchAll(/<div class="case-body">([\s\S]*?)\n          <\/div>\n        <\/article>/g)].map((m) => m[1]);
  assert.equal(bodies.length, 3);
  for (const b of bodies) {
    const main = b.indexOf('<div class="case-main">'), extra = b.indexOf('<div class="case-extra">');
    assert.ok(main >= 0 && extra > main, 'main details, then the extra block');
    assert.ok(b.indexOf('case-head') > main && b.indexOf('case-story') > main && b.indexOf('case-story') < extra, 'header and story in the main block');
    assert.ok(b.indexOf('case-figures') > extra && b.indexOf('case-toggle') > extra, 'figures and button in the extra block');
  }
  const css = read('styles.css');
  assert.match(cssRule(css, '.case-body'), /display:contents/, 'main and extra join the case grid');
  assert.match(cssRule(css, '.case-main'), /grid-column:2/);
  assert.match(cssRule(css, '.case-main'), /grid-row:1/);
  assert.match(cssRule(css, '.case-extra'), /grid-column:2/);
  assert.match(cssRule(css, '.case-extra'), /grid-row:2/);
  assert.match(cssRule(css, '.case'), /row-gap:0/, 'second row starts exactly at the photo bottom');
  assert.match(cssRule(css, '.case-figures'), /margin:0/, 'divider sits at the top of the second row');
});

test('a divider separates each case from the next, centred in the space between them', () => {
  const css = read('styles.css');
  const gap = Number(cssRule(css, '.cases').match(/gap:(\d+)px/)[1]);
  const next = cssRule(css, '.case + .case');
  assert.match(next, /border-top:1px solid var\(--rule\)/);
  const pad = Number(next.match(/padding-top:(\d+)px/)[1]);
  assert.equal(pad, gap, 'equal space above and below the divider');
  assert.match(css, /@media \(max-width:860px\)\{[^}]*\.cases\{gap:40px;\}[^}]*\}/, 'tighter on small screens');
  assert.match(css, /\.case \+ \.case\{padding-top:40px;\}/);
});

test('every page loads Archivo for headings and Inter for text, and nothing else', () => {
  for (const page of ['index.html', 'resume.html', 'contact.html']) {
    const html = read(page);
    assert.match(html, /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Archivo:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">/, `${page} loads Archivo + Inter`);
    assert.ok(!html.includes('Space+Grotesk'), `${page} no longer loads Space Grotesk`);
  }
});

test('headings use gentle tracking so the narrower Archivo letters are not crowded', () => {
  const css = read('styles.css');
  const track = (sel) => Number(cssRule(css, sel).match(/letter-spacing:(-?[\d.]+)em/)[1]);
  assert.ok(track('.hero h1') >= -0.01, `hero headline tracking ${track('.hero h1')}em`);
  assert.ok(track('h1,h2,h3') >= -0.01, `heading tracking ${track('h1,h2,h3')}em`);
});
