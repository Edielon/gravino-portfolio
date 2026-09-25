# Multi-page Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single-page portfolio into Home, Resume and Contact pages with a shared stylesheet and nav, a Web3Forms contact form, and subtle building line art beside the hero headline.

**Architecture:** Three static HTML pages share one `styles.css`, and each carries an identical nav/footer block. Structure is checked by a zero-dependency Node test (`node --test`) that reads the HTML as text. Layout and behaviour are checked in the browser against the local preview server (`node .claude/serve.js`, port 4173).

**Tech Stack:** Plain HTML5, CSS, a small vanilla JS block on the contact page, Node 18+ built-in test runner for structural tests, Google Fonts (Space Grotesk, Inter).

**Spec:** `docs/superpowers/specs/2026-09-25-multi-page-portfolio-design.md`

## Global Constraints

- Static only: no build step, no backend, no npm dependencies.
- Pages link with relative `.html` paths: `index.html`, `resume.html`, `contact.html`, `index.html#work`.
- Fonts: Space Grotesk for headings (`--font-display`), Inter for everything else (`--font-body`). No other typefaces.
- Headings use `--heading` (graphite). Burgundy `--accent` is for small accents only, never headline text.
- The hero headline text stays exactly: `Hi, I'm Hanny Gravino, a <span class="nowrap">PMP-certified</span> project manager with a structural engineering background.`, with no subtext.
- Nav labels are exactly `Work`, `Resume`, `Contact`. The wordmark is `H. Gravino`.
- Contact rows are Email, Phone, LinkedIn only (no Location).
- Web3Forms endpoint `https://api.web3forms.com/submit`. The placeholder key is exactly `YOUR_WEB3FORMS_ACCESS_KEY`.
- Line art: `aria-hidden="true"`, stroke `--rule-strong`, no fills, no animation, never overlapping the headline box.
- After finishing, republish `index.html` plus the supporting files to https://claude.ai/artifact/LiKngY8nwyeBYjV6jcT1Nw.

## Review Focus

- **Direct deep link to `resume.html` or `contact.html`:** the page must render fully styled with the nav, not depend on `index.html` having loaded first. Test: every page links `styles.css` and contains the full nav (Task 1 and Task 3 tests).
- **Contact form submitted with the placeholder key:** it must show "not connected yet" and never POST. Test: script checks for the placeholder before `fetch` (Task 4 test plus browser check).
- **Contact form network failure or non-200 response:** show an error with the email fallback, and re-enable the button. Browser check in Task 4 (offline simulation via a bad endpoint).
- **Viewport 1240–1300px:** the tightest width where the line art shows; it must not touch the headline. Browser measurement in Task 5.
- **"Work" link clicked from resume or contact:** it must land on the home page's Selected work section. Test: href is `index.html#work` on every page (Task 2 test).

---

### Task 1: Page scaffold, shared stylesheet and structural test harness

**Files:**
- Create: `styles.css`
- Create: `tests/site.test.mjs`
- Modify: `index.html` (lines 1–423: the `<title>`, font links and the `<style>` block)

**Interfaces:**
- Produces: `styles.css`, which holds every rule currently in `index.html`'s `<style>`. Also produces the test helpers `read(file)` and `navOf(html)` in `tests/site.test.mjs`, used by later tasks' tests.

- [ ] **Step 1: Write the failing test**

Create `tests/site.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

export const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
export const navOf = (html) => (html.match(/<header class="site-nav">[\s\S]*?<\/header>/) || [''])[0];

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/`
Expected: FAIL. "styles.css exists" fails.

- [ ] **Step 3: Move the CSS and add a proper document head**

1. Copy everything between `<style>` (line 5) and `</style>` (line 423) of `index.html` into a new `styles.css`, leaving out the tags themselves. Un-indent by two spaces.
2. Replace lines 1–423 of `index.html` with:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gravino Engineering</title>
<meta name="description" content="Hanny Gravino, PMP-certified project manager with a structural engineering background.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
</head>
<body>
```

3. Append `</body>\n</html>` after the closing `</footer>` at the end of `index.html`.
4. Add `body{margin:0;}` right after the `*{box-sizing:border-box;}` rule in `styles.css`. The artifact wrapper used to supply this reset, and a standalone page needs it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/`
Expected: PASS (2 tests).

Then run `node .claude/serve.js` in the background, open http://localhost:4173 and confirm the page looks identical to before (fonts, colours, layout).

- [ ] **Step 5: Commit**

```bash
git add styles.css tests/site.test.mjs index.html
git commit -m "Move styles into shared styles.css and add structural tests"
```

---

### Task 2: Shared nav and a trimmed home page

**Files:**
- Modify: `index.html`: nav (old lines 425–438), `#profile` section, remove `.career` block, `#expertise` and `#contact` sections, hero buttons
- Modify: `styles.css`: nav active state
- Test: `tests/site.test.mjs`

**Interfaces:**
- Consumes: `read`, `navOf` from Task 1.
- Produces: the canonical nav markup below, which Tasks 3 and 4 copy verbatim, changing only which link carries `aria-current="page"`. Also the helper test `assertNav(html, current)`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/site.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL on "home page nav" (wordmark href is `#profile`) and on "home page keeps…" (`id="expertise"` present).

- [ ] **Step 3: Implement**

1. Replace the `<header class="site-nav">…</header>` block with:

```html
<header class="site-nav">
  <div class="wrap nav-inner">
    <a class="wordmark" href="index.html">H. Gravino</a>
    <nav aria-label="Main">
      <ul class="nav-links">
        <li><a href="index.html#work">Work</a></li>
        <li><a href="resume.html">Resume</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
    </nav>
  </div>
</header>
```

2. In `index.html`, delete the whole `<div class="wrap career">…</div>` block (Career + Education, inside `#profile`). Keep a copy for Task 3.
3. Delete `<section class="block" id="expertise">…</section>` (keep a copy for Task 3) and `<section class="band" id="contact">…</section>` (keep a copy for Task 4).
4. Change the ghost button to `<a class="btn btn-ghost" href="contact.html">Discuss a Project</a>`.
5. Change the footer's back-to-top link from `href="#profile"` to `href="#top"`, and add `id="top"` to `<header class="site-nav">`.
6. Add to `styles.css` after the `.nav-links a:hover` rule:

```css
.nav-links a[aria-current="page"]{box-shadow:inset 0 -2px 0 var(--accent);}
.nav-links a[aria-current="page"]:hover{box-shadow:none;}
```

7. Leave the `.contact`, `.contact-grid`, `.contact-note`, `.contact-lines` and `.c-row` rules in `styles.css` untouched. The contact page in Task 4 reuses them.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/`
Expected: PASS (4 tests).

Browser: http://localhost:4173. The nav shows H. Gravino · Work · Resume · Contact. The page ends with Certifications and then the footer. "View Work" scrolls to Selected work.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css tests/site.test.mjs
git commit -m "Trim home page to hero, work and certifications with new nav"
```

---

### Task 3: Resume page

**Files:**
- Create: `resume.html`
- Modify: `styles.css`: page header style
- Test: `tests/site.test.mjs`

**Interfaces:**
- Consumes: `assertNav` (Task 2). Also the Career/Education markup and the `#expertise` section copied out in Task 2, and the existing `.career`, `.timeline`, `.t-row`, `.legend`, `.legend-row` and `.placeholder` classes in `styles.css`.
- Produces: the `.page-head` class (resume page only; the contact page uses the band heading instead).

- [ ] **Step 1: Write the failing test**

Append to `tests/site.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/`
Expected: FAIL with ENOENT for `resume.html`.

- [ ] **Step 3: Implement**

Create `resume.html`. Use the same `<head>` as `index.html` from Task 1, except:
- `<title>Resume · Gravino Engineering</title>`
- `<meta name="description" content="Career, education and expertise of Hanny Gravino, PMP-certified project manager and structural engineer.">`

The body is the nav from Task 2 with `aria-current="page"` on Resume:

```html
<li><a href="resume.html" aria-current="page">Resume</a></li>
```

then:

```html
<main>
  <div class="wrap page-head">
    <div class="label">Resume</div>
    <h1>Career, education and expertise</h1>
  </div>

  <!-- paste the <div class="wrap career"> … </div> block removed from index.html in Task 2, unchanged -->

  <!-- paste the <section class="block" id="expertise"> … </section> block removed in Task 2, unchanged -->
</main>

<footer class="site-foot wrap">
  <span>&copy; Hanny Creselle B. Gravino &middot; Civil Engineer</span>
  <a href="#top">Back to top</a>
</footer>
</body>
</html>
```

Add to `styles.css`:

```css
.page-head{padding-block:56px 8px;}
.page-head h1{margin-top:14px; font-size:clamp(34px, 4.6vw, 52px); line-height:1.05;}
.page-head + .career{padding-top:40px;}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/`
Expected: PASS (5 tests).

Browser: http://localhost:4173/resume.html. Nav "Resume" is underlined. Career and Education sit side by side above 860px and stack below it. Expertise rows render. Clicking "Work" lands on the home page's Selected work section.

- [ ] **Step 5: Commit**

```bash
git add resume.html styles.css tests/site.test.mjs
git commit -m "Add resume page with career, education and expertise"
```

---

### Task 4: Contact page with Web3Forms form

**Files:**
- Create: `contact.html`
- Modify: `styles.css`: form styles
- Test: `tests/site.test.mjs`

**Interfaces:**
- Consumes: `assertNav` (Task 2). Also the `#contact` band markup copied in Task 2, and the classes `.band`, `.contact`, `.contact-grid`, `.contact-note`, `.contact-lines`, `.c-row`.
- Produces: form element ids `cf-name`, `cf-email`, `cf-company`, `cf-type`, `cf-message`, `cf-status`, and the form id `contact-form`.

- [ ] **Step 1: Write the failing test**

Append to `tests/site.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/`
Expected: FAIL with ENOENT for `contact.html`.

- [ ] **Step 3: Implement the page**

Create `contact.html`. Use the same `<head>` as `index.html`, except:
- `<title>Contact · Gravino Engineering</title>`
- `<meta name="description" content="Discuss a construction or structural project with Hanny Gravino.">`

The body is the nav with `aria-current="page"` on Contact, then:

```html
<main>
  <section class="band">
    <div class="wrap contact">
      <div class="contact-grid">
        <div>
          <h1 class="section-title">Discuss a project</h1>
          <p class="contact-note">Available for construction project management, structural design and seismic retrofit assessment work.</p>
          <div class="contact-lines">
            <div class="c-row"><div class="k">Email</div><div class="v">[ Add email address ]</div></div>
            <div class="c-row"><div class="k">Phone</div><div class="v">[ Add phone number ]</div></div>
            <div class="c-row"><div class="k">LinkedIn</div><div class="v">[ Add profile link ]</div></div>
          </div>
        </div>

        <form id="contact-form" action="https://api.web3forms.com/submit" method="POST" novalidate>
          <input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY">
          <input type="hidden" name="subject" value="New enquiry from gravino portfolio">
          <input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">

          <div class="field">
            <label for="cf-name">Name</label>
            <input id="cf-name" name="name" type="text" autocomplete="name" required aria-describedby="cf-name-err">
            <p class="field-err" id="cf-name-err" hidden>Please enter your name.</p>
          </div>
          <div class="field">
            <label for="cf-email">Email</label>
            <input id="cf-email" name="email" type="email" autocomplete="email" required aria-describedby="cf-email-err">
            <p class="field-err" id="cf-email-err" hidden>Please enter a valid email address.</p>
          </div>
          <div class="field">
            <label for="cf-company">Company <span class="opt">(optional)</span></label>
            <input id="cf-company" name="company" type="text" autocomplete="organization">
          </div>
          <div class="field">
            <label for="cf-type">Project type</label>
            <select id="cf-type" name="project_type">
              <option>Project management</option>
              <option>Structural design</option>
              <option>Seismic retrofit</option>
              <option>Other</option>
            </select>
          </div>
          <div class="field">
            <label for="cf-message">Message</label>
            <textarea id="cf-message" name="message" rows="6" required aria-describedby="cf-message-err"></textarea>
            <p class="field-err" id="cf-message-err" hidden>Please tell me a little about the project.</p>
          </div>

          <button class="btn btn-primary" type="submit">Send enquiry</button>
          <p class="form-status" id="cf-status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </div>
  </section>
</main>

<footer class="site-foot wrap">
  <span>&copy; Hanny Creselle B. Gravino &middot; Civil Engineer</span>
  <a href="#top">Back to top</a>
</footer>

<script>
(() => {
  const form = document.getElementById('contact-form');
  const status = document.getElementById('cf-status');
  const button = form.querySelector('button[type="submit"]');
  const checks = [
    ['cf-name', (v) => v.trim() !== ''],
    ['cf-email', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())],
    ['cf-message', (v) => v.trim() !== ''],
  ];

  function validate() {
    let firstBad = null;
    for (const [id, ok] of checks) {
      const input = document.getElementById(id);
      const valid = ok(input.value);
      input.setAttribute('aria-invalid', String(!valid));
      document.getElementById(id + '-err').hidden = valid;
      if (!valid && !firstBad) firstBad = input;
    }
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  function say(text, kind) {
    status.textContent = text;
    status.dataset.kind = kind;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validate()) return;
    if (form.access_key.value === 'YOUR_WEB3FORMS_ACCESS_KEY') {
      say('The form is not connected yet. Please use the email address on this page for now.', 'error');
      return;
    }
    button.disabled = true;
    say('Sending…', 'info');
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || res.status);
      form.reset();
      checks.forEach(([id]) => document.getElementById(id).removeAttribute('aria-invalid'));
      say('Thank you. Your enquiry has been sent and I will reply within two working days.', 'success');
    } catch {
      say('Sorry, the message could not be sent. Please try again or use the email address on this page.', 'error');
    } finally {
      button.disabled = false;
    }
  });
})();
</script>
</body>
</html>
```

- [ ] **Step 4: Add the form styles**

Add to `styles.css`:

```css
.contact h1.section-title{color:var(--band-ink);}
.contact-note{margin-top:20px;}
.contact-lines{margin-top:32px;}

#contact-form{display:grid; gap:18px;}
.field{display:grid; gap:6px;}
.field label{
  font-size:12px;
  font-weight:500;
  letter-spacing:0.1em;
  text-transform:uppercase;
  color:var(--band-muted);
}
.field .opt{text-transform:none; letter-spacing:0;}
.field input, .field select, .field textarea{
  width:100%;
  min-height:46px;
  padding:11px 14px;
  font:inherit;
  font-size:16px;
  color:var(--band-ink);
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.28);
  border-radius:0;
}
.field select{appearance:none; background-image:linear-gradient(45deg, transparent 50%, var(--band-muted) 50%), linear-gradient(135deg, var(--band-muted) 50%, transparent 50%); background-position:calc(100% - 20px) 50%, calc(100% - 15px) 50%; background-size:5px 5px; background-repeat:no-repeat; padding-right:40px;}
.field select option{color:var(--ink);}
.field textarea{resize:vertical; min-height:140px;}
.field input:focus-visible, .field select:focus-visible, .field textarea:focus-visible{outline:2px solid var(--band-ink); outline-offset:2px; border-color:var(--band-ink);}
.field [aria-invalid="true"]{border-color:#FF9AA8;}
.field-err{font-size:14px; color:#FFB3BD;}
#contact-form .btn{justify-self:start; min-height:46px;}
#contact-form .btn:disabled{opacity:0.6; cursor:progress;}
.form-status{font-size:15px; min-height:1.6em; color:var(--band-ink);}
.form-status[data-kind="error"]{color:#FFB3BD;}
.hp{position:absolute; left:-9999px; width:1px; height:1px; opacity:0;}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tests/`
Expected: PASS (6 tests).

Browser: http://localhost:4173/contact.html.
- Submitting empty shows three inline errors and focuses Name.
- Filling the form and submitting shows "not connected yet" and makes no network request (check `read_network_requests` for `web3forms`).
- Tab order: Name → Email → Company → Project type → Message → Send. Focus rings are visible.
- At 375px the form sits under the contact rows with no horizontal scroll.
- Error-path check: temporarily set the access key to `test` in DevTools (`document.querySelector('[name=access_key]').value='test'`) and submit. Web3Forms rejects it, the error message appears, and the button re-enables.

- [ ] **Step 6: Commit**

```bash
git add contact.html styles.css tests/site.test.mjs
git commit -m "Add contact page with Web3Forms enquiry form"
```

---

### Task 5: Hero line art

**Files:**
- Modify: `index.html`: wrap the hero in `.hero-stage` and add two SVGs
- Modify: `styles.css`: hero measure variable and line-art positioning
- Test: `tests/site.test.mjs`

**Interfaces:**
- Consumes: the existing `.hero` block and `.hero h1` rule.
- Produces: the `--hero-measure` custom property and the `.hero-stage` / `.hero-art` classes.

Note: the spec says the drawings hide "below about 1100px". The actual breakpoint is set by measurement in Step 4. It is expected to land around 1240px, which is the first width where each gutter is at least 110px wide.

- [ ] **Step 1: Write the failing test**

Append to `tests/site.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/`
Expected: FAIL with "hero-stage wraps the hero".

- [ ] **Step 3: Implement**

Wrap the existing `<div class="wrap hero">…</div>` in `index.html` like this (the hero contents stay unchanged):

```html
<div class="hero-stage">
  <svg class="hero-art hero-art--left" viewBox="0 0 240 320" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linejoin="round">
      <line x1="0" y1="318" x2="240" y2="318"/>
      <rect x="20" y="210" width="130" height="108"/>
      <line x1="20" y1="246" x2="150" y2="246"/>
      <line x1="20" y1="282" x2="150" y2="282"/>
      <line x1="63" y1="210" x2="63" y2="318"/>
      <line x1="106" y1="210" x2="106" y2="318"/>
      <rect x="32" y="220" width="20" height="16"/><rect x="75" y="220" width="20" height="16"/><rect x="118" y="220" width="20" height="16"/>
      <rect x="32" y="256" width="20" height="16"/><rect x="75" y="256" width="20" height="16"/><rect x="118" y="256" width="20" height="16"/>
      <rect x="75" y="292" width="20" height="26"/>
      <line x1="184" y1="318" x2="184" y2="48"/>
      <line x1="196" y1="318" x2="196" y2="48"/>
      <polyline points="184,318 196,300 184,282 196,264 184,246 196,228 184,210 196,192 184,174 196,156 184,138 196,120 184,102 196,84 184,66 196,48"/>
      <line x1="60" y1="48" x2="236" y2="48"/>
      <line x1="60" y1="40" x2="236" y2="40"/>
      <polyline points="60,48 68,40 76,48 84,40 92,48 100,40 108,48 116,40 124,48 132,40 140,48 148,40 156,48 164,40 172,48 180,40 188,48 196,40 204,48 212,40 220,48 228,40 236,48"/>
      <polyline points="184,40 190,14 196,40"/>
      <line x1="190" y1="14" x2="60" y2="40"/>
      <line x1="190" y1="14" x2="236" y2="40"/>
      <rect x="214" y="48" width="20" height="12"/>
      <rect x="198" y="52" width="14" height="12"/>
      <line x1="112" y1="48" x2="112" y2="150"/>
      <path d="M112 150 v8 a5 5 0 1 1 -8 4"/>
    </g>
  </svg>

  <div class="wrap hero">
    <!-- existing hero contents, unchanged -->
  </div>

  <svg class="hero-art hero-art--right" viewBox="0 0 240 320" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linejoin="round">
      <line x1="0" y1="318" x2="240" y2="318"/>
      <line x1="40" y1="318" x2="40" y2="60"/>
      <line x1="100" y1="318" x2="100" y2="60"/>
      <line x1="160" y1="318" x2="160" y2="60"/>
      <line x1="220" y1="318" x2="220" y2="60"/>
      <line x1="40" y1="60" x2="220" y2="60"/>
      <line x1="40" y1="103" x2="220" y2="103"/>
      <line x1="40" y1="146" x2="220" y2="146"/>
      <line x1="40" y1="189" x2="220" y2="189"/>
      <line x1="40" y1="232" x2="220" y2="232"/>
      <line x1="40" y1="275" x2="220" y2="275"/>
      <line x1="40" y1="52" x2="220" y2="52"/>
      <line x1="40" y1="52" x2="40" y2="60"/><line x1="220" y1="52" x2="220" y2="60"/>
      <line x1="55" y1="146" x2="55" y2="189"/><line x1="70" y1="146" x2="70" y2="189"/><line x1="85" y1="146" x2="85" y2="189"/>
      <line x1="115" y1="146" x2="115" y2="189"/><line x1="130" y1="146" x2="130" y2="189"/><line x1="145" y1="146" x2="145" y2="189"/>
      <line x1="175" y1="146" x2="175" y2="189"/><line x1="190" y1="146" x2="190" y2="189"/><line x1="205" y1="146" x2="205" y2="189"/>
      <line x1="40" y1="275" x2="100" y2="318"/><line x1="100" y1="275" x2="40" y2="318"/>
      <line x1="40" y1="232" x2="100" y2="275"/><line x1="100" y1="232" x2="40" y2="275"/>
      <line x1="16" y1="60" x2="16" y2="318"/>
      <line x1="12" y1="60" x2="20" y2="60"/><line x1="12" y1="318" x2="20" y2="318"/>
      <line x1="12" y1="146" x2="20" y2="146"/><line x1="12" y1="189" x2="20" y2="189"/>
    </g>
  </svg>
</div>
```

Add to `styles.css`. Put `--hero-measure` inside `:root`, then add the rules and change `.hero h1`'s `max-width` to `var(--hero-measure)`:

```css
:root{ --hero-measure:940px; }

.hero h1{max-width:var(--hero-measure);}

.hero-stage{position:relative; overflow-x:clip;}
.hero-stage > .hero{position:relative; z-index:1;}
.hero-art{
  display:none;
  position:absolute;
  bottom:0;
  width:min(260px, calc(50% - var(--hero-measure) / 2 - 48px));
  height:auto;
  color:var(--rule-strong);
  opacity:0.45;
  pointer-events:none;
}
.hero-art--left{right:calc(50% + var(--hero-measure) / 2 + 24px);}
.hero-art--right{left:calc(50% + var(--hero-measure) / 2 + 24px);}
@media (min-width:1240px){ .hero-art{display:block;} }
```

- [ ] **Step 4: Run the test, then measure and tune in the browser**

Run: `node --test tests/`
Expected: PASS (7 tests).

In the browser at http://localhost:4173, run this for widths 1240, 1280, 1440 and 1920 (iframe technique: create an iframe of that width, wait for `fonts.ready`):

```js
const h = d.querySelector('.hero h1').getBoundingClientRect();
const L = d.querySelector('.hero-art--left').getBoundingClientRect();
const R = d.querySelector('.hero-art--right').getBoundingClientRect();
({ lines: Math.round(h.height / parseFloat(getComputedStyle(d.querySelector('.hero h1')).lineHeight)),
   leftGap: Math.round(h.left - L.right), rightGap: Math.round(R.left - h.right),
   artW: Math.round(L.width), hScroll: d.documentElement.scrollWidth > w })
```

Pass criteria at every width:
- `leftGap >= 24` and `rightGap >= 24`
- `artW >= 110`
- `hScroll === false`
- headline `lines <= 4`

If `artW < 110` at 1240, raise the breakpoint in 20px steps until it passes. If the headline goes over 4 lines, reduce the `.hero h1` font-size cap from 56px to 52px. At 1239px and 375px, confirm both `.hero-art` elements have `display:none`.

Take a screenshot at 1440 to judge the look. The art should read as faint drafting linework, not as a graphic competing with the headline. Adjust `opacity` between 0.35 and 0.5 if needed.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css tests/site.test.mjs
git commit -m "Add building line art beside the hero headline"
```

---

### Task 6: Docs, full verification, publish

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-09-25-multi-page-portfolio-design.md` (breakpoint line only, if it changed)

- [ ] **Step 1: Update `CLAUDE.md`**

Replace the first paragraph under `# Gravino portfolio` with:

```markdown
Multi-page static portfolio for Hanny Creselle B. Gravino, PMP-certified project manager and structural engineer. Pages: `index.html` (hero, work, certifications), `resume.html` (career, education, expertise), `contact.html` (details + Web3Forms enquiry form). Shared styles live in `styles.css`; the nav/footer block is duplicated in each page, so change all three together. Structural tests: `node --test tests/`. Local preview: `node .claude/serve.js` → http://localhost:4173.

The site is also published as the Claude artifact https://claude.ai/artifact/LiKngY8nwyeBYjV6jcT1Nw (index.html as the page, the other files as supporting files). After editing, republish to that same URL.

The contact form needs a real Web3Forms access key in place of `YOUR_WEB3FORMS_ACCESS_KEY` in `contact.html`.
```

If Task 5 changed the breakpoint, update the spec's "Hidden below about 1100px" line to match.

- [ ] **Step 2: Full verification (superpowers:verification-before-completion)**

Run: `node --test tests/`. Expected: all 7 pass.

In the browser, for each page at 1440, 1024 and 375px:
- no horizontal scroll
- nav links work
- the active link is correct
- fonts are Space Grotesk and Inter

Click every button and link, including footer "Back to top".

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-09-25-multi-page-portfolio-design.md
git commit -m "Document multi-page structure"
```

- [ ] **Step 4: Publish the artifact**

Publish `index.html` to https://claude.ai/artifact/LiKngY8nwyeBYjV6jcT1Nw with `files: {"styles.css": "styles.css", "resume.html": "resume.html", "contact.html": "contact.html"}`. Report to the user whether the cross-page links work inside the artifact. If they don't, say so plainly and recommend a free host (GitHub Pages works from this repo with no changes).

- [ ] **Step 5: Push**

Only when the user asks: `git pull --rebase && git push origin main`.
