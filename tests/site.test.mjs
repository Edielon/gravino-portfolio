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
