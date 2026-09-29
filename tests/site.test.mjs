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
  for (const token of ['--heading:', '--accent:', "--font-display:'Space Grotesk'", "--font-body:'Inter'"]) {
    assert.ok(css.includes(token), `missing ${token}`);
  }
});

export function assertNav(html, current) {
  const nav = navOf(html);
  assert.match(nav, /<a class="wordmark" href="index.html">H. Gravino<\/a>/);
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
  const rows = [...html.matchAll(/<div class="k">([^<]+)<\/div>/g)].map((m) => m[1]);
  assert.deepEqual(rows, ['Email', 'Phone', 'LinkedIn']);
  assert.match(html, /<form id="contact-form" action="https:\/\/api.web3forms.com\/submit" method="POST"/);
  assert.match(html, /name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY"/);
  for (const [id, required] of [['cf-name', true], ['cf-email', true], ['cf-company', false], ['cf-subject', true], ['cf-message', true]]) {
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

test('resume page offers the CV download right under the header', () => {
  const html = read('resume.html');
  const head = (html.match(/<div class="wrap page-head">[\s\S]*?\n  <\/div>/) || [''])[0];
  const link = head.match(/<a class="btn btn-primary" href="([^"]+)" download="([^"]+)"[^>]*>Download CV<\/a>/);
  assert.ok(link, 'Download CV button inside the page header');
  assert.equal(link[2], 'Hanny-Gravino-CV.pdf');
  assert.ok(existsSync(new URL(`../${link[1]}`, import.meta.url)), `${link[1]} exists`);
  assert.ok(head.indexOf('</h1>') < head.indexOf('Download CV'), 'button comes after the heading');
  assert.match(head, /PDF &middot; \d+ KB/);
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
  for (const grid of ['.stats', '.cred-grid']) {
    assert.match(cssRule(css, grid), /border:1px solid var\(--band-line\)/, `${grid} has a closed frame`);
    assert.match(cssRule(css, grid), /border-radius:6px/, `${grid} has tight rounded outer corners`);
  }
  assert.ok(!css.includes('.quals::before'), 'no extended top and bottom rules any more');
  assert.ok(!css.includes('.cred-table::before'), 'no extended rules on the certifications table');
  assert.ok(!/background-clip/.test(stats), 'no side padding trick needed any more');
  // Dividers are drawn on each cell's left and top edge and clipped at the table edge, so sub-pixel
  // rounding can never expose a stray line down the right side.
  for (const [grid, cell] of [['.stats', '.stat'], ['.cred-grid', '.cred-cell']]) {
    assert.ok(!/background:var\(--band-line\)/.test(cssRule(css, grid)), `${grid} has no line-coloured background`);
    assert.match(cssRule(css, grid), /overflow:hidden/, `${grid} clips edge dividers`);
    assert.match(cssRule(css, cell), /box-shadow:-1px 0 0 var\(--band-line\), 0 -1px 0 var\(--band-line\)/, `${cell} draws left and top dividers`);
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
  const cells = [...section[0].matchAll(/<li class="cred-cell"><a class="cred-open" href="(assets\/certificates\/[a-z-]+\.jpg)" data-title="([^"]+)" aria-haspopup="dialog"><span class="cred-title">([^<]+)<\/span><span class="cred-desc">([^<]+)<\/span><span class="cred-view">View certificate<\/span><\/a><\/li>/g)]
    .map(([, href, dataTitle, title, desc]) => ({ href, dataTitle, title, desc: desc.replace(/&middot;/g, '·') }));
  assert.deepEqual(cells.map((c) => c.title), ['PMP', 'CAPM', 'MIEAust', 'MIET', 'M.ASCE', 'PMI Member']);
  assert.deepEqual(cells.map((c) => c.desc), [
    'Project Management Professional, Project Management Institute · 2026',
    'Certified Associate in Project Management, Project Management Institute · 2025',
    'Member, Engineers Australia · 2025',
    'Member, Institution of Engineering and Technology · 2025',
    'Member, American Society of Civil Engineers · 2025',
    'Project Management Institute, Queensland Australia Chapter · 2025',
  ]);
  for (const c of cells) assert.ok(existsSync(new URL(`../${c.href}`, import.meta.url)), `${c.href} exists`);
  for (const notHere of ['placeholder', 'PRC', 'Diploma', 'White Card', 'MIDAS', 'PICE']) {
    assert.ok(!section[0].includes(notHere), `home certifications should not include ${notHere}`);
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
  assert.match(html, /<div class="edu-name">Diploma of Project Management \(BSB50820\)<\/div>\s*<div class="edu-meta">Canterbury Technical Institute, Brisbane &middot; 2024<\/div>/);
  const training = html.match(/<section class="block" id="training">[\s\S]*?<\/section>/);
  assert.ok(training, 'training section');
  assert.match(training[0], /<h2 class="section-title">Training and CPD<\/h2>/);
  const rows = [...training[0].matchAll(/<div class="t-date">([^<]+)<\/div>\s*<div>\s*<div class="t-role">([^<]+)<\/div>\s*<div class="t-org">([^<]+)<\/div>/g)].map((m) => m.slice(1));
  assert.deepEqual(rows.map((r) => r[0]), ['Sep 2023', 'Nov 2022', 'Nov 2022', 'Jul 2022', 'Apr 2022', 'Mar 2022']);
  assert.equal(rows.length, 6);
  assert.ok(html.indexOf('id="training"') < html.indexOf('id="expertise"'), 'training sits before expertise');
  assert.ok(!html.includes('PRC'), 'no PRC licence');
});

test('view certificate label stays readable on the graphite band', () => {
  const css = read('styles.css');
  assert.match(cssRule(css, '.cred-view'), /color:var\(--accent-on-band\)/);
  const ratio = contrast(hex(token(css, '--accent-on-band')), hex(token(css, '--band')));
  assert.ok(ratio >= 4.5, `label contrast ${ratio.toFixed(2)}`);
});
