import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// Normalise line endings so checks don't depend on how git checked the files out (core.autocrlf).
export const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
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
    ['Work', 'index.html#work'], ['Resume', 'resume.html'], ['Services', 'services.html'], ['Contact', 'contact.html'],
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
  assert.match(html, /<a class="btn btn-ghost" href="contact.html">Discuss a Project<\/a>\s*<a class="btn btn-ghost" href="#certifications">Certifications<\/a>/, 'third hero button after Discuss a Project');
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
  assert.deepEqual(copies, ['hannygravino.ph@gmail.com', '+639473245278']);
  assert.match(lines[1], /\+63 947 324 5278/, 'phone shown in readable groups');

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
      ['Work', 'index.html#work'], ['Resume', 'resume.html'], ['Services', 'services.html'], ['Contact', 'contact.html'], ['Back to top', '#top'],
    ], page);
    assert.deepEqual(links.filter((l) => l.current).map((l) => l.label), current ? [current] : [], `${page} current`);
    // Full-width footer with an inner wrap; the contact page uses the light footer under its graphite band.
    const cls = page === 'contact.html' ? 'site-foot site-foot--light' : 'site-foot';
    assert.match(foot, new RegExp(`^<footer class="${cls}">\\s*<div class="wrap foot-inner">`), `${page} footer markup`);
  }
});

test('footer is graphite with light text and a visible current-page underline', () => {
  const css = read('styles.css');
  const foot = cssRule(css, 'footer.site-foot');
  assert.match(foot, /background:var\(--band\)/);
  assert.match(foot, /color:var\(--band-muted\)/);
  assert.match(foot, /border-top:1px solid var\(--band-line\)/, 'separates it from the graphite contact band');
  // Short pages on tall screens: the canvas below the footer continues the graphite, not the grey page.
  assert.match(css, /\nhtml\{background:var\(--band\);\}/);
  assert.match(css, /\nbody\{\n  background:var\(--bg\);/);
  // Contact page: the light footer (grey page, muted text, burgundy underline) on a grey canvas.
  assert.match(cssRule(css, 'footer.site-foot--light'), /background:none;[^}]*border-top:0;[^}]*color:var\(--ink-muted\)/);
  assert.match(cssRule(css, '.site-foot--light .foot-links a'), /color:var\(--ink\)/);
  assert.match(cssRule(css, '.site-foot--light .foot-links a:hover'), /color:var\(--accent-text\)/);
  assert.match(cssRule(css, '.site-foot--light .foot-links a[aria-current="page"]'), /var\(--accent\)/);
  assert.match(css, /\nhtml:has\(\.site-foot--light\)\{background:var\(--bg\);\}/);
  assert.match(cssRule(css, '.foot-links a'), /color:var\(--band-ink\)/);
  assert.match(cssRule(css, '.foot-links a:hover'), /color:var\(--accent-on-band\)/);
  assert.match(cssRule(css, '.foot-links a[aria-current="page"]'), /var\(--accent-on-band\)/);
  const band = hex(token(css, '--band'));
  for (const t of ['--band-muted', '--band-ink', '--accent-on-band']) {
    const ratio = contrast(hex(token(css, t)), band);
    assert.ok(ratio >= 4.5, `${t} on graphite: ${ratio.toFixed(2)}`);
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

test('resume page shows the headshot photo instead of a placeholder', () => {
  const html = read('resume.html');
  assert.ok(!html.includes('Add headshot photo'), 'placeholder removed');
  const img = html.match(/<img class="headshot" src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"[^>]*>/);
  assert.ok(img, 'headshot image with alt text and reserved size');
  assert.equal(img[2], 'Hanny Gravino');
  assert.equal(img[3] * 5, img[4] * 4, '4:5 ratio');
  assert.ok(existsSync(new URL(`../${img[1]}`, import.meta.url)), `${img[1]} exists`);
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

export const CASES = [
  { file: 'case-cor-jesu-law.html', title: 'Center for Law and Graduate Studies, Cor Jesu College' },
  { file: 'case-norbert-retrofit.html', title: 'Norbert Building Retrofit, Cor Jesu College' },
  { file: 'case-project-derisk.html', title: 'Project DeRisk, Senterprisys Limited' },
];

test('each home page case shows only the short story and links to its full case page', () => {
  const html = read('index.html');
  const work = html.match(/<section class="block work" id="work">[\s\S]*?<\/section>/);
  assert.ok(work, 'work section uses the editorial layout');
  const cases = [...work[0].matchAll(/<article class="case">([\s\S]*?)<\/article>/g)].map((m) => m[1]);
  assert.equal(cases.length, 3);
  cases.forEach((c, i) => {
    assert.match(c, new RegExp(`<span class="case-num" aria-hidden="true">0${i + 1}</span>`));
    assert.match(c, new RegExp(`<h3>${CASES[i].title}</h3>`));
    assert.match(c, /<div class="case-story">/);
    for (const term of ['Problem', 'Approach', 'Result']) {
      const row = c.match(new RegExp(`<dt>${term}</dt>\\s*<dd>([^<]+)</dd>`));
      assert.ok(row, `${term} row in case ${i + 1} holds plain short text`);
    }
    assert.match(c, new RegExp(`<a class="case-link" href="${CASES[i].file}">Read the Full Case</a>`));
    for (const gone of ['story-long', 'story-short', 'case-tools', 'case-toggle', 'aria-expanded', '<button']) {
      assert.ok(!c.includes(gone), `no expand-in-place leftovers (${gone}) in case ${i + 1}`);
    }
  });
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  assert.ok(!scripts.includes('.case-toggle'), 'expand script removed');
  const css = read('styles.css');
  for (const gone of ['.case-toggle', '.is-open', '.is-expanded', '.story-long']) {
    assert.ok(!css.includes(gone), `no ${gone} styles left`);
  }
});

test('each case has its own page with the full story, figures and a next-case link', () => {
  CASES.forEach(({ file, title }, i) => {
    assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${file} exists`);
    const html = read(file);
    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /<link rel="stylesheet" href="styles.css">/);
    assert.match(html, new RegExp(`<title>${title.split(',')[0]} · Gravino Engineering</title>`));
    assert.match(html, /<body>\s*<div id="top"><\/div>/);
    // Nav: Work is the current section (not a page), so it uses aria-current="true".
    const nav = navOf(html);
    assert.match(nav, /<a class="wordmark" href="index.html#top">H. Gravino<\/a>/);
    assert.match(nav, /<li><a href="index.html#work" aria-current="true">Work<\/a><\/li>/);
    assert.match(html, /<a class="case-back" href="index.html#work">All work<\/a>/);
    assert.match(html, new RegExp(`<span class="case-num" aria-hidden="true">0${i + 1}</span>\\s*<div class="case-heading">\\s*<h1>${title}</h1>\\s*<p class="case-meta">[^<]+</p>`));
    const next = CASES[(i + 1) % CASES.length];
    assert.match(html, new RegExp(`<a class="case-next" href="${next.file}">\\s*<span class="case-next-label">Next case</span>\\s*<span class="case-next-title">0${((i + 1) % 3) + 1} &middot; ${next.title.split(',')[0]}</span>`));
    const foot = html.match(/<footer class="site-foot">[\s\S]*?<\/footer>/);
    assert.ok(foot, `${file} graphite footer`);
    assert.match(foot[0], /<li><a href="#top">Back to top<\/a><\/li>/);
    assert.match(html, /<ul class="case-figures">\s*<li><strong>/);
    // Cases 1 and 2 are full story pages (tested separately); case 3 still holds the placeholder copy.
    if (i < 2) return;
    assert.match(html, /<div class="case-photo"><span>Add project photo or drawing<\/span><\/div>/);
    // Placeholder copy: the current long text, one section per step.
    const home = read('index.html');
    for (const term of ['Problem', 'Approach', 'Result']) {
      const sec = html.match(new RegExp(`<section class="case-section">\\s*<h2>${term}</h2>\\s*<p>([\\s\\S]+?)</p>\\s*</section>`));
      assert.ok(sec, `${file} ${term} section`);
      assert.ok(sec[1].length > 60, `${file} ${term} uses the full text`);
      // Some short lines are the opening of the long text, so check the full passage is gone from the home page.
      assert.ok(!home.replace(/\s+/g, ' ').includes(sec[1].trim()), `${term} long text no longer sits on the home page`);
    }
  });
  const css = read('styles.css');
  assert.match(css, /\.nav-links a\[aria-current\]\{box-shadow:inset 0 -2px 0 var\(--accent\);\}/, 'current section underlined');
  assert.match(cssRule(css, '.case-section'), /grid-template-columns:/);
  assert.match(css, /@media \(max-width:640px\)\{[^}]*\.case-section\{grid-template-columns:1fr;/);
});

// Shared checks for an illustrated case story: chapters, sized and described images, GIF-like videos, gallery.
const checkStoryPage = (file, { minImages, videoCount, minGallery }) => {
  const html = read(file);
  const article = html.match(/<article class="case-page case-story-page">([\s\S]*?)<\/article>/);
  assert.ok(article, `${file} story layout`);
  const body = article[1];
  assert.ok(!/—|&mdash;/.test(html), `${file} has no em dashes`);
  assert.ok(!html.includes('Add project photo'), 'placeholder photo gone');
  const chapters = [...body.matchAll(/<section class="story-chapter">\s*<h2>([^<]+)<\/h2>/g)];
  assert.ok(chapters.length >= 5, 'story told in chapters');
  const imgs = [...html.matchAll(/<img ([^>]+)>/g)].map((m) => m[1]).filter((a) => !a.includes('class="cert-image"'));
  assert.ok(imgs.length >= minImages, `uses the document figures (${imgs.length})`);
  for (const attrs of imgs) {
    const src = attrs.match(/src="([^"]+)"/)[1];
    assert.ok(existsSync(new URL(`../${src}`, import.meta.url)), `${src} exists`);
    assert.match(attrs, /alt="[^"]+"/, `${src} has alt text`);
    assert.match(attrs, /width="\d+" height="\d+"/, `${src} reserves its size`);
  }
  for (const [, href] of html.matchAll(/<a class="file-open" href="([^"]+)"/g)) {
    assert.ok(existsSync(new URL(`../${href}`, import.meta.url)), `${href} exists`);
  }
  const videos = [...body.matchAll(/<video ([^>]+)>\s*<source src="([^"]+)" type="video\/mp4">/g)];
  assert.equal(videos.length, videoCount, 'mode videos');
  for (const [, attrs, src] of videos) {
    for (const a of ['autoplay', 'muted', 'loop', 'playsinline']) assert.ok(attrs.split(/\s+/).includes(a), `${src} ${a}`);
    const poster = attrs.match(/poster="([^"]+\.jpg)"/);
    assert.ok(poster && existsSync(new URL(`../${poster[1]}`, import.meta.url)), `${src} poster`);
    assert.ok(!attrs.includes('controls'), 'plays like a GIF');
    assert.ok(existsSync(new URL(`../${src}`, import.meta.url)), `${src} exists`);
  }
  const gallery = body.match(/<section class="story-file"[\s\S]*?<\/section>/);
  assert.ok(gallery, 'full engineering file gallery');
  assert.ok([...gallery[0].matchAll(/<a class="file-open" href="([^"]+)"/g)].length >= minGallery, 'gallery figures open full size');
  assert.match(html, /<dialog class="cert-dialog"/, 'gallery reuses the certificate pop-up');
  assert.match(html, /prefers-reduced-motion: reduce/, 'videos pause for reduced motion');
  return { html, body };
};

test('case 1 reads as an illustrated story with looping mode videos and a full engineering file', () => {
  const { html, body } = checkStoryPage('case-cor-jesu-law.html', { minImages: 36, videoCount: 3, minGallery: 20 });
  assert.ok(!html.includes('3,000'), 'old floor area gone');
  assert.ok(!/79[,.]87|79,870/.test(html), 'total project cost not published');
  assert.match(body, /<strong>4,970 m&sup2;<\/strong>/);
  assert.match(body, /<strong>182 m<\/strong>/);
});

test('case 2 compares the building before and after the retrofit, in pairs of looping mode videos', () => {
  const { html, body } = checkStoryPage('case-norbert-retrofit.html', { minImages: 70, videoCount: 6, minGallery: 40 });
  for (const [, t] of body.matchAll(/<strong>([^<]+)<\/strong>/g)) assert.ok(!/RGS/.test(t));
  for (const hidden of ['RGS', 'Hinlog', 'Filmix', 'Sosme', 'adracec', 'Aspire']) assert.ok(!html.includes(hidden), `${hidden} not named`);
  assert.match(body, /<strong>1\.6 km<\/strong>/);
  assert.match(body, /0\.915/);
  assert.match(body, /0\.675/);
  const pairs = body.match(/<div class="story-videos story-videos--pairs">([\s\S]*?)<\/div>\s*<p class="story-note">/);
  assert.ok(pairs, 'videos laid out as before/after pairs');
  const order = [...pairs[1].matchAll(/<source src="assets\/cases\/norbert-retrofit\/([a-z-]+-\d)\.mp4"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['existing-mode-1', 'retrofit-mode-1', 'existing-mode-2', 'retrofit-mode-2', 'existing-mode-3', 'retrofit-mode-3']);
  assert.match(read('styles.css'), /\.story-videos--pairs\{grid-template-columns:repeat\(2, 1fr\);/);
});

test('home page case 2 card shows the retrofit model photo, linked to its case page', () => {
  const cards = [...read('index.html').matchAll(/<article class="case">([\s\S]*?)<\/article>/g)];
  const img = cards[1][1].match(/<a class="case-photo case-photo--img case-photo--roomy" href="case-norbert-retrofit.html"[^>]*>\s*<img src="([^"]+)" alt="[^"]+" width="\d+" height="\d+"/);
  assert.ok(img, 'photo with alt text and reserved size');
  assert.ok(existsSync(new URL(`../${img[1]}`, import.meta.url)));
  assert.match(cssRule(read('styles.css'), '.case-photo--roomy img'), /padding:7%/, 'model sits inside a margin so it is not cramped');
});

test('home page header shows the toned site photo instead of the placeholder', () => {
  const html = read('index.html');
  const hero = html.match(/<div class="hero-photo">([\s\S]*?)<\/div>/);
  assert.ok(hero, 'hero photo block');
  assert.ok(!hero[1].includes('Placeholder'), 'placeholder removed');
  const img = hero[1].match(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"[^>]*>/);
  assert.ok(img, 'photo with alt text and reserved size');
  assert.equal(img[1], 'assets/hero-site.jpg');
  assert.ok(existsSync(new URL(`../${img[1]}`, import.meta.url)));
  assert.match(cssRule(read('styles.css'), '.hero-photo img'), /object-fit:cover/);
  assert.ok(!read('styles.css').includes('.hero-photo::after'), 'no burgundy corner block on the photo');
});

test('hero specialties pill sits above the headline', () => {
  const hero = read('index.html').match(/<div class="wrap hero">([\s\S]*?)<\/div>\s*<\/div>/)[1];
  assert.ok(hero.indexOf('class="specialties"') < hero.indexOf('<h1>'), 'pill first');
  assert.ok(hero.indexOf('<h1>') < hero.indexOf('class="actions"'), 'buttons after the headline');
});

test('home page case 1 card shows the ETABS model photo, linked to its case page', () => {
  const html = read('index.html');
  const first = html.match(/<article class="case">([\s\S]*?)<\/article>/)[1];
  assert.ok(!first.includes('Add project photo'), 'placeholder replaced');
  const img = first.match(/<figure class="case-media">\s*<a class="case-photo case-photo--img" href="case-cor-jesu-law.html"[^>]*>\s*<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"[^>]*>/);
  assert.ok(img, 'photo with alt text and reserved size');
  assert.equal(img[1], 'assets/cases/cor-jesu-law/etabs-3d-model.jpg');
  assert.ok(existsSync(new URL(`../${img[1]}`, import.meta.url)));
  assert.match(read('styles.css'), /\.case-photo--img img\{[^}]*object-fit:contain/);
});

test('home page case 1 card uses the BOQ floor area', () => {
  const html = read('index.html');
  assert.ok(!html.includes('3,000 m&sup2;'));
  assert.match(html, /<li><strong>4,970 m&sup2;<\/strong><span>[^<]+<\/span><\/li>/);
});

const cssRule = (css, sel) => {
  const start = css.indexOf('\n' + sel + '{');
  return start < 0 ? '' : css.slice(start + sel.length + 2, css.indexOf('}', start));
};

test('selected work keeps photos on the left with no stray lines', () => {
  const css = read('styles.css');
  assert.match(cssRule(css, 'section.work'), /border-top:none/);
  for (const sel of ['.case', '.case-photo', '.case-link']) {
    assert.ok(cssRule(css, sel), `${sel} rule exists`);
    assert.ok(!/border(-top|-bottom)?:\s*[1-9]/.test(cssRule(css, sel)), `${sel} has no border line`);
  }
  assert.ok(!/nth-child\(even\)[^{]*\.case-media/.test(css), 'no alternating image sides');
  assert.match(cssRule(css, '.case'), /align-items:start/, 'photo stays at the top of the case');
});

test('case numbers are burgundy and figures sit under a hairline', () => {
  const css = read('styles.css');
  assert.match(cssRule(css, '.case-num'), /color:var\(--accent-text\)/);
  assert.match(cssRule(css, '.case-figures'), /border-top:1px solid var\(--rule\)/);
});

test('section titles have no accent bar above them', () => {
  assert.ok(!read('styles.css').includes('.section-title::before'));
});

test('read the full case is a filled button link with readable burgundy text', () => {
  const css = read('styles.css');
  const btn = cssRule(css, '.case-link');
  assert.match(btn, /background:var\(--button-soft\)/, 'filled with the soft button grey');
  assert.match(btn, /color:var\(--accent-text\)/, 'burgundy label');
  assert.match(btn, /padding:12px 20px/);
  assert.match(btn, /min-height:44px/);
  assert.match(cssRule(css, '.case-link:hover'), /background:var\(--button-soft-hover\)/);
  assert.match(btn, /text-decoration:none/);
  assert.match(cssRule(css, '.case-link::after'), /content:"\\2192"/, 'arrow instead of a plus');
  assert.match(cssRule(css, '.case-link:hover::after'), /transform:translateX\(3px\)/);
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
  assert.deepEqual(items.map(([t]) => t), ['Project Management Professional', 'Licensed Civil Engineer', 'Structural Designer & Analyst', 'Construction Estimator', 'Project Coordinator']);
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

test('home certifications sit in a white section and each opens its certificate', () => {
  const html = read('index.html');
  const section = html.match(/<section class="creds-band" id="certifications">[\s\S]*?<\/section>/);
  assert.ok(section, 'certifications section is white, not a graphite band');
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
  const section = html.match(/<section class="creds-band" id="certifications">[\s\S]*?<\/section>/)[0];
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
  // The symbols sit directly on the card, left-aligned in a 48px row: no disc, tile or background colour.
  const logo = cssRule(css, '.cred-logo');
  assert.match(logo, /height:var\(--cred-logo\)/);
  assert.match(logo, /align-items:center/);
  assert.ok(!/background|border-radius/.test(logo), 'no tile behind the logo');
  assert.ok(!/margin/.test(logo), 'logo is not nudged with margins');
});

test('certifications use the hero pill colour with dark text and a burgundy link', () => {
  const css = read('styles.css');
  // Section and cards share the --panel fill of the hero specialties pill.
  assert.equal(token(css, '--card'), token(css, '--panel'), 'cards match the hero pill');
  assert.match(cssRule(css, '.specialties'), /background:var\(--panel\)/);
  assert.match(cssRule(css, '.cred-cell'), /background:var\(--card\)/);
  assert.ok(contrast(hex(token(css, '--card-line')), hex(token(css, '--card'))) >= 1.2, 'dividers visible on the panel');
  // Graphite headline colour, and a frame so the table reads on the panel colour.
  assert.match(cssRule(css, '.creds-band'), /background:var\(--card\)/);
  assert.match(cssRule(css, '.creds-band'), /display:flow-root/, 'no margin collapse gap above the section');
  assert.ok(!/\.creds-band \.section-title\{[^}]*band-ink/.test(css), 'headline is not the light band colour');
  assert.match(cssRule(css, '.cred-grid'), /border:1px solid var\(--card-line\)/);
  // Third shadow fills the 1px corner where dividers cross, or the graphite band shows through as a dot.
  assert.match(cssRule(css, '.cred-cell'), /box-shadow:-1px 0 0 var\(--card-line\), 0 -1px 0 var\(--card-line\), -1px -1px 0 var\(--card-line\)/);
  assert.match(cssRule(css, '.cred-open'), /color:var\(--heading\)/);
  assert.match(cssRule(css, '.cred-desc'), /color:var\(--ink-muted\)/);
  assert.match(cssRule(css, '.cred-view'), /color:var\(--accent-text\)/);
  const card = hex(token(css, '--card'));
  for (const t of ['--heading', '--ink-muted', '--accent-text']) {
    const ratio = contrast(hex(token(css, t)), card);
    assert.ok(ratio >= 4.5, `${t} on the card: ${ratio.toFixed(2)}`);
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
  // Without it, .tab-list would show as a dead control when JavaScript is off.
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
  assert.match(divider, /clip-path:inset\(0 0 0 calc\(100% - 1px\)\)/, 'at rest only a 1px line shows');
  assert.match(divider, /background:var\(--rule\)/);
});

test('hovering Read the Full Case grows the number tile and turns the story labels into burgundy buttons', () => {
  const css = read('styles.css');
  // Triggered from the case's own link (hover, or keyboard focus); no script involved.
  const on = (target) => `.case:has(.case-link:hover) ${target}, .case:has(.case-link:focus-visible) ${target}`;
  const tile = cssRule(css, on('.case-heading::before'));
  assert.match(tile, /clip-path:inset\(0\)/, 'divider expands leftward into a full tile');
  assert.match(tile, /background:var\(--accent\)/, 'tile turns burgundy');
  const num = cssRule(css, on('.case-num'));
  assert.match(num, /color:var\(--accent-on\)/, 'number turns white');
  assert.match(num, /transform:translateX\(10px\)/, 'number moves to the centre of the tile (half the 20px gap)');
  assert.match(cssRule(css, '.case-heading::before'), /width:calc\(var\(--num-size\) \* 1\.2 \+ 20px\)/, 'tile spans the number column plus the gap');
  // Number slides in lockstep with the tile, both ways, and the whole thing stays snappy.
  const clipOf = (rule) => cssRule(css, rule).match(/clip-path (\d+ms cubic-bezier\([^)]*\)(?: \d+ms)?)/)[1];
  const moveOf = (rule) => cssRule(css, rule).match(/transform (\d+ms cubic-bezier\([^)]*\)(?: \d+ms)?)/)[1];
  assert.equal(moveOf(on('.case-num')), clipOf(on('.case-heading::before')), 'in: number moves with the tile');
  assert.equal(moveOf('.case-num'), clipOf('.case-heading::before'), 'out: number moves back with the tile');
  const ends = (t) => [...t.matchAll(/(\d+)ms(?: [a-z-]+| cubic-bezier\([^)]*\))?(?: (\d+)ms)?/g)].map((m) => Number(m[1]) + Number(m[2] || 0));
  for (const rule of [on('.case-heading::before'), on('.case-num')]) {
    assert.ok(Math.max(...ends(cssRule(css, rule).match(/transition:([^;]+)/)[1])) <= 220, `${rule} finishes within 220ms`);
  }
  // Labels: burgundy button, white text, slight growth, without moving the description text.
  const dt = cssRule(css, on('.story-row dt'));
  assert.match(dt, /background:var\(--accent\)/);
  assert.match(dt, /color:var\(--accent-on\)/);
  assert.match(dt, /transform:scale\(1\.08\)/);
  assert.ok(!/font-size/.test(dt), 'no font-size swap, so the description never moves');
  const rest = cssRule(css, '.story-row dt');
  assert.match(rest, /padding:3px 8px/);
  assert.match(rest, /margin-left:-8px/, 'padding is pulled back at rest so the row never shifts');
  assert.match(rest, /transform-origin:left center/);
  const column = Number(cssRule(css, '.story-row').match(/grid-template-columns:(\d+)px 1fr/)[1]);
  assert.ok((77 + 16) * 1.08 <= column, `grown label fits the ${column}px column`);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{ \.case-heading::before, \.case-num, \.story-row dt\{transition:none;\} \}/);
});

test('case numbers share one width so the dividers line up', () => {
  const num = cssRule(read('styles.css'), '.case-num');
  assert.match(num, /font-variant-numeric:tabular-nums/);
  assert.match(num, /width:1\.2em/);
});

test('case details sit beside the photo and the figures divider starts at the photo bottom', () => {
  const html = read('index.html');
  const bodies = [...html.matchAll(/<div class="case-body">([\s\S]*?)\n          <\/div>\n        <\/article>/g)].map((m) => m[1]);
  assert.equal(bodies.length, 3);
  for (const b of bodies) {
    const main = b.indexOf('<div class="case-main">'), extra = b.indexOf('<div class="case-extra">');
    assert.ok(main >= 0 && extra > main, 'main details, then the extra block');
    assert.ok(b.indexOf('case-head') > main && b.indexOf('case-story') > main && b.indexOf('case-story') < extra, 'header and story in the main block');
    assert.ok(b.indexOf('case-figures') > extra && b.indexOf('case-link') > extra, 'figures and link in the extra block');
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

test('case pages list Services in the nav and footer, between Resume and Contact', () => {
  for (const { file } of CASES) {
    const html = read(file);
    const nav = navOf(html);
    const navLinks = [...nav.matchAll(/<li><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/li>/g)].map((m) => m[2]);
    assert.deepEqual(navLinks, ['Work', 'Resume', 'Services', 'Contact'], `${file} nav`);
    const foot = html.match(/<footer class="site-foot">[\s\S]*?<\/footer>/)[0];
    const footLinks = [...foot.matchAll(/<li><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/li>/g)].map((m) => [m[2], m[1]]);
    assert.deepEqual(footLinks, [['Work', 'index.html#work'], ['Resume', 'resume.html'], ['Services', 'services.html'], ['Contact', 'contact.html'], ['Back to top', '#top']], `${file} footer`);
  }
});

test('services page is a full document with the shared nav, graphite footer and Services current', () => {
  assert.ok(existsSync(new URL('../services.html', import.meta.url)), 'services.html exists');
  const html = read('services.html');
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<title>Services · HannBuilders by Hanny Gravino<\/title>/);
  assert.match(html, /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Archivo:wdth,wght@62\.\.125,500\.\.800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">/);
  assert.match(html, /<link rel="stylesheet" href="styles.css">/);
  assertNav(html, 'Services');
  const foot = html.match(/<footer class="site-foot">[\s\S]*?<\/footer>/);
  assert.ok(foot, 'graphite footer');
  assert.match(foot[0], /<li><a href="services.html" aria-current="page">Services<\/a><\/li>/);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, 'one h1');
  assert.match(html, /<main class="hb" id="hb">/);
});

test('services hero: headline, contact links, enquiry tabs, paths and recent work', () => {
  const html = read('services.html');
  const hero = html.match(/<section class="hb-hero-wrap"[\s\S]*?<\/section>/)[0];
  assert.match(hero, /<h1 id="hb-title">Build, retrofit or plan it <em>with an engineer<\/em> beside you\.<\/h1>/);
  assert.match(hero, /href="mailto:hannygravino\.ph@gmail\.com"/);
  assert.match(hero, /href="tel:\+639473245278"/);
  assert.match(hero, /<div class="hb-tabs" role="tablist" aria-label="Enquiry type">/);
  assert.match(hero, /<button class="hb-tab" type="button" role="tab" id="hb-tab-quote" aria-controls="hb-pane-quote" aria-selected="true">Request a quote<\/button>/);
  assert.match(hero, /<button class="hb-tab" type="button" role="tab" id="hb-tab-ask" aria-controls="hb-pane-ask" aria-selected="false" tabindex="-1">Ask a question<\/button>/);
  const chips = [...hero.matchAll(/<button class="hb-chip" type="button" aria-pressed="false" data-path="([a-z]+)">/g)].map((m) => m[1]);
  assert.deepEqual(chips, ['build', 'damage', 'pm', 'boq']);
  assert.match(hero, /<p class="hb-answer" id="hb-answer" aria-live="polite" hidden><\/p>/);
  assert.match(hero, /<a class="hb-mini" href="case-cor-jesu-law\.html">/);
  assert.match(hero, /<a class="hb-mini" href="case-norbert-retrofit\.html">/);
  assert.match(hero, /src="assets\/cases\/norbert-retrofit\/building-scaffold\.jpg"/);
});

test('services brand tokens are scoped to .hb and meet contrast', () => {
  const css = read('styles.css');
  const block = css.slice(css.indexOf('/* ===== HannBuilders services page ===== */'));
  assert.ok(css.includes('/* ===== HannBuilders services page ===== */'), 'HannBuilders block exists');
  const tokens = { '--hb-ink': '#1E2124', '--hb-ink-2': '#4A4E53', '--hb-muted': '#6B6F74', '--hb-bg': '#F4F2EE', '--hb-panel': '#FFFFFF', '--hb-stone': '#E7E4DE', '--hb-line': '#DCD8D0', '--hb-orange': '#E2621B', '--hb-orange-deep': '#B44912', '--hb-orange-soft': '#FBE9DE', '--hb-orange-light': '#F0884F' };
  for (const [name, value] of Object.entries(tokens)) assert.match(block, new RegExp(`${name}:${value};`), name);
  // Every selector in the block is scoped to the page.
  const selectors = [...block.matchAll(/(?:^|\})\s*([^@{}][^{}]*)\{/g)].map((m) => m[1].trim()).filter((s) => s && !s.startsWith('/*') && !s.startsWith('@') && !/^(from|to|\d+%)$/.test(s));
  for (const sel of selectors) for (const part of sel.split(',')) assert.match(part.trim(), /\.hb|html:has\(\.hb\)/, `unscoped selector: ${part.trim()}`);
  const pairs = [['#1E2124', '#E2621B'], ['#F0884F', '#1E2124'], ['#B44912', '#F4F2EE'], ['#B44912', '#FFFFFF'], ['#4A4E53', '#FFFFFF'], ['#6B6F74', '#F4F2EE'], ['#CFCDC8', '#1E2124']];
  for (const [fg, bg] of pairs) assert.ok(contrast(hex(fg), hex(bg)) >= 4.5, `${fg} on ${bg}`);
});

test('services anchors clear both sticky bars', () => {
  const css = read('styles.css');
  assert.match(css, /html:has\(\.hb\)\{scroll-padding-top:calc\(var\(--hb-nav-h, 64px\) \+ var\(--hb-bar-h, 66px\) \+ 16px\);\}/);
  assert.match(css, /\.hb-bar\{[^}]*position:sticky;[^}]*top:var\(--hb-nav-h, 64px\)/);
  const scripts = [...read('services.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  assert.match(scripts, /--hb-nav-h/);
  assert.match(scripts, /--hb-bar-h/);
});

test('services sections appear in order with their anchors', () => {
  const html = read('services.html');
  const ids = [...html.matchAll(/<section class="hb-section[^"]*" id="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['services', 'process', 'projects', 'why', 'about', 'faq', 'quote']);
});

test('services: three owner services, three remote team services', () => {
  const html = read('services.html');
  const cards = (block) => [...block.matchAll(/<h3>([^<]+?)(?: <span class="hb-remote">Remote<\/span>)?<\/h3>/g)].map((m) => m[1]);
  const owners = html.match(/<div class="hb-svc" aria-label="For owners">([\s\S]*?)<\/article>\s*<\/div>/)[1];
  const teams = html.match(/<div class="hb-svc" aria-label="For project teams">([\s\S]*?)<\/article>\s*<\/div>/)[1];
  assert.deepEqual(cards(owners), ['Design and build', 'Seismic assessment and retrofit', 'Construction management']);
  assert.deepEqual(cards(teams), ['Project management', 'Structural design and analysis', 'Cost estimating, BOQ and BOM']);
  assert.ok(!owners.includes('hb-remote'), 'owner services are not remote');
  assert.equal((teams.match(/<span class="hb-remote">Remote<\/span>/g) || []).length, 3);
});

test('services: process steps, founder-led projects with honest credit, founder and FAQ', () => {
  const html = read('services.html');
  const steps = [...html.matchAll(/<li class="hb-step hb-reveal"[^>]*><span class="hb-step-num">(\d\d)<\/span><div><h3>([^<]+)<\/h3>/g)].map((m) => m[2]);
  assert.deepEqual(steps, ['Talk it through', 'Assess and design', 'Estimate and plan', 'Build or manage', 'Hand over']);
  assert.match(html, /<a class="hb-pc hb-reveal" href="case-cor-jesu-law\.html">/);
  assert.match(html, /<a class="hb-pc hb-reveal" href="case-norbert-retrofit\.html"/);
  assert.match(html, /<b data-count="4970" data-suffix=" m&sup2;">4,970 m&sup2;<\/b>/);
  assert.match(html, /<b data-count="6\.3" data-dec="1">6\.3<\/b>/);
  assert.match(html, /Projects delivered while working with WMCabardo Engineering &amp; Consulting and ADRA Constructions Corporation\./);
  assert.match(html, /<h2 id="hb-about-title">Hi, I'm Hanny Gravino\.<\/h2>/);
  assert.match(html, /<a class="hb-pill hb-pill--dark" href="resume\.html">View full resume/);
  for (const logo of ['pmi', 'engineers-australia', 'iet', 'asce']) assert.match(html, new RegExp(`src="assets/issuers/${logo}\\.png"`));
  const faq = [...html.matchAll(/<details class="hb-q"><summary>([^<]+)<\/summary>/g)].map((m) => m[1]);
  assert.equal(faq.length, 6);
  assert.match(html, /<button class="hb-pill hb-pill--dark hb-ask-link" type="button">Ask a question/);
  // Honesty: no prices or testimonials in the visible content (scripts use `$` legitimately, so they are skipped).
  const text = html.replace(/<script>[\s\S]*?<\/script>/g, '');
  for (const banned of ['testimonial', 'Testimonial', '₱', 'PHP ', '$']) assert.ok(!text.includes(banned), `no ${banned}`);
});

test('services layouts stack on small screens', () => {
  const css = read('styles.css');
  const block = css.slice(css.indexOf('/* ===== HannBuilders services page ===== */'));
  assert.match(block, /@media \(max-width:900px\)\{[^@]*\.hb \.hb-svc, \.hb \.hb-why, \.hb \.hb-trust\{grid-template-columns:1fr 1fr;\}/);
  assert.match(block, /@media \(max-width:900px\)\{[^@]*\.hb \.hb-process, \.hb \.hb-founder, \.hb \.hb-faq, \.hb \.hb-quote\{grid-template-columns:1fr;\}/);
  assert.match(block, /@media \(max-width:640px\)\{[^@]*\.hb \.hb-svc, \.hb \.hb-why, \.hb \.hb-trust, \.hb \.hb-proj\{grid-template-columns:1fr;\}/);
});

const servicesScripts = () => [...read('services.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');

test('services quote form posts to Web3Forms with the right required fields', () => {
  const html = read('services.html');
  const form = html.match(/<form class="hb-qform" id="hb-quote-form"[^>]*>[\s\S]*?<\/form>/)[0];
  assert.match(form, /action="https:\/\/api\.web3forms\.com\/submit" method="POST" novalidate/);
  assert.match(form, /name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY"/);
  assert.match(form, /name="botcheck"/);
  const required = { 'hb-q-service': true, 'hb-q-type': false, 'hb-q-location': true, 'hb-q-size': false, 'hb-q-timeline': false, 'hb-q-name': true, 'hb-q-email': true, 'hb-q-phone': false, 'hb-q-message': true };
  for (const [id, req] of Object.entries(required)) {
    assert.match(form, new RegExp(`<label class="hb-label" for="${id}">`), `label for ${id}`);
    const field = form.match(new RegExp(`<(input|select|textarea)[^>]*id="${id}"[^>]*>`));
    assert.ok(field, id);
    assert.equal(/\brequired\b/.test(field[0]), req, `${id} required=${req}`);
    if (req) assert.match(form, new RegExp(`id="${id}-err"`), `${id} has an inline error`);
  }
  assert.match(form, /<option>Not sure yet<\/option>/);
  assert.match(form, /id="hb-q-status" role="status" aria-live="polite"/);
});

test('services forms validate trimmed input and never send with the placeholder key', () => {
  const js = servicesScripts();
  assert.match(js, /\.trim\(\)/, 'checks trim whitespace');
  const placeholder = js.indexOf("'YOUR_WEB3FORMS_ACCESS_KEY'");
  assert.ok(placeholder > -1 && placeholder < js.indexOf('fetch('), 'placeholder check before fetch');
  assert.match(js, /'HannBuilders quote: ' \+/);
  assert.match(js, /hbSubmit\(document\.getElementById\('hb-quote-form'\)/);
  assert.match(js, /hbSubmit\(document\.getElementById\('hb-pane-ask'\)/);
});

test('services chips set the service and answer; continue carries values to the full form', () => {
  const js = servicesScripts();
  for (const service of ['Design and build', 'Seismic assessment and retrofit', 'Project management', 'Cost estimating, BOQ and BOM']) {
    assert.ok(js.includes(`service: '${service}'`), `chip maps to ${service}`);
  }
  assert.match(js, /aria-pressed/);
  assert.match(js, /getElementById\('hb-continue'\)|\$\('hb-continue'\)/);
  assert.match(js, /hb-q-service/);
  assert.match(js, /hb-q-location/);
  assert.match(js, /scrollIntoView/);
  assert.match(js, /ArrowRight/, 'tabs support arrow keys');
  assert.match(js, /\.hb-ask-link/, 'FAQ ask buttons open the Ask tab');
});
