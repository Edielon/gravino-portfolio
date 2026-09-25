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
  for (const [id, required] of [['cf-name', true], ['cf-email', true], ['cf-company', false], ['cf-type', false], ['cf-message', true]]) {
    assert.match(html, new RegExp(`<label for="${id}"`), `label for ${id}`);
    const field = html.match(new RegExp(`<(input|select|textarea)[^>]*id="${id}"[^>]*>`));
    assert.ok(field, `field ${id}`);
    assert.equal(/\brequired\b/.test(field[0]), required, `${id} required=${required}`);
  }
  assert.match(html, /id="cf-status"[^>]*role="status"/);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(script.indexOf('YOUR_WEB3FORMS_ACCESS_KEY') < script.indexOf('fetch('), 'placeholder check runs before fetch');
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
  const rule = css.match(/\.field input, \.field select, \.field textarea\{[^}]*border:1px solid ([^;]+);/)[1];
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
