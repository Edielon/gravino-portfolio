# HannBuilders Services Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a branded HannBuilders Services page (`services.html`) to the portfolio, linked from every page's nav and footer, with an enquiry card, "What brings you here?" paths, services, process, founder-led projects, FAQ and a Web3Forms quote form.

**Architecture:** One new static page, `services.html`, sharing the portfolio's nav, footer and `styles.css`. All HannBuilders styles are scoped under `<main class="hb">` and every class is prefixed `hb-`, so nothing leaks into other pages and no existing class (`.hero`, `.card`, `.tag`) is reused. Behaviour is plain inline `<script>` blocks at the end of the page, like the other pages; the page reads fully without JavaScript.

**Tech Stack:** Static HTML, CSS, vanilla JS. Tests: Node built-in test runner (`node --test tests/site.test.mjs`). Preview: `node .claude/serve.js` → http://localhost:4173.

**Spec:** `docs/superpowers/specs/2026-10-06-hannbuilders-services-design.md`
**Reference mockup (local, not committed):** `.superpowers/brainstorm/1179-1791217821/content/services-full.html`

## Global Constraints

- Fonts: Archivo for headings, Inter for everything else; no other typefaces. `services.html` loads `https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..800&family=Inter:wght@400;500;600&display=swap`; other pages keep their current link.
- Nav and footer order on every page: Work · Resume · Services · Contact (footer adds Back to top). Seven pages: `index.html`, `resume.html`, `contact.html`, `case-cor-jesu-law.html`, `case-norbert-retrofit.html`, `case-project-derisk.html`, `services.html`.
- Services page brand tokens (exact): `--hb-ink:#1E2124; --hb-ink-2:#4A4E53; --hb-muted:#6B6F74; --hb-bg:#F4F2EE; --hb-panel:#FFFFFF; --hb-stone:#E7E4DE; --hb-line:#DCD8D0; --hb-orange:#E2621B; --hb-orange-deep:#B44912; --hb-orange-soft:#FBE9DE; --hb-orange-light:#F0884F;`
- Every HannBuilders class starts with `hb-`; every HannBuilders rule in `styles.css` lives in the block that starts with the comment `/* ===== HannBuilders services page ===== */`.
- Contact: `hannygravino.ph@gmail.com`, `+63 947 324 5278` (`tel:+639473245278`).
- Web3Forms: `action="https://api.web3forms.com/submit"`, access key placeholder `YOUR_WEB3FORMS_ACCESS_KEY`, hidden `botcheck` honeypot; the placeholder check runs before `fetch`.
- Honesty: no prices, testimonials, client logos or company history. Projects are "led by our founder"; credit line names WMCabardo Engineering & Consulting and ADRA Constructions Corporation.
- All motion is disabled under `prefers-reduced-motion: reduce`.
- Tests read files through `read()` (line endings normalised). Bash heredocs strip backslashes on this machine: edit test files with the Edit tool, not `cat <<EOF`.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push with `git pull --rebase -q && git push -q origin main`.

## Review Focus

- A visitor types only spaces into a required field: validation must reject it (every check uses `.trim()`), not send an empty enquiry. Pinned in Task 4.
- The access key is still the placeholder: both the quote form and the question form must show the "not connected yet" message and never call `fetch`. Pinned in Task 4.
- Anchor jumps (brand-bar links, "Request a quote", "See our services") must not land under the two sticky bars: `html:has(.hb)` gets a larger `scroll-padding-top` driven by the measured bar heights. Pinned in Task 2.
- JavaScript off or failing: revealed content must still be visible (the hidden start state only applies under `.hb-js`), and counted figures show their final values in the HTML. Pinned in Task 5.
- A 375px phone: no horizontal scroll; hero, grids and form collapse to one column. Pinned by the stacking rules test in Task 3 and the browser check in Task 6.

---

### Task 1: Add Services to the nav and footer of the six existing pages

**Files:**
- Modify: `index.html`, `resume.html`, `contact.html`, `case-cor-jesu-law.html`, `case-norbert-retrofit.html`, `case-project-derisk.html` (nav `<ul class="nav-links">` and footer `<ul class="foot-links">`)
- Test: `tests/site.test.mjs` (`assertNav`, footer test)

**Interfaces:**
- Produces: nav list `Work, Resume, Services, Contact` with Services `href="services.html"`; footer list `Work, Resume, Services, Contact, Back to top`. Task 2 copies this nav and footer into `services.html` with `aria-current="page"` on Services.

- [ ] **Step 1: Update the nav assertion in `assertNav`** (Edit tool)

In `tests/site.test.mjs`, inside `export function assertNav`, replace

```js
  assert.deepEqual(links.map((l) => [l.label, l.href]), [
    ['Work', 'index.html#work'], ['Resume', 'resume.html'], ['Contact', 'contact.html'],
  ]);
```

with

```js
  assert.deepEqual(links.map((l) => [l.label, l.href]), [
    ['Work', 'index.html#work'], ['Resume', 'resume.html'], ['Services', 'services.html'], ['Contact', 'contact.html'],
  ]);
```

- [ ] **Step 2: Update the footer test**

In `test('footer repeats the nav links plus back to top on every page'`, replace

```js
      ['Work', 'index.html#work'], ['Resume', 'resume.html'], ['Contact', 'contact.html'], ['Back to top', '#top'],
```

with

```js
      ['Work', 'index.html#work'], ['Resume', 'resume.html'], ['Services', 'services.html'], ['Contact', 'contact.html'], ['Back to top', '#top'],
```

- [ ] **Step 3: Add a test that the case pages carry the Services link too**

Append to the end of `tests/site.test.mjs`:

```js
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
```

- [ ] **Step 4: Run the tests and confirm they fail**

Run: `node --test tests/site.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)|^✖"`
Expected: failures in `home page nav`, `resume page`, `contact page`, the footer test and the new case-pages test.

- [ ] **Step 5: Insert the Services link on all six pages**

Run this Node script (saved to the scratchpad as `add-services-link.cjs`, run with `node`):

```js
const fs = require('fs');
const root = 'C:/Users/carli/Documents/gravino-portfolio/';
const pages = ['index.html', 'resume.html', 'contact.html', 'case-cor-jesu-law.html', 'case-norbert-retrofit.html', 'case-project-derisk.html'];
for (const page of pages) {
  let h = fs.readFileSync(root + page, 'utf8').replace(/\r\n/g, '\n');
  const before = h;
  // Nav and footer both list Resume then Contact; Services goes between them.
  h = h.replace(/(\n(\s*)<li><a href="resume\.html"[^>]*>Resume<\/a><\/li>\n)/g, '$1$2<li><a href="services.html">Services</a></li>\n');
  const count = (h.match(/<li><a href="services\.html">Services<\/a><\/li>/g) || []).length;
  if (count !== 2) throw new Error(`${page}: expected 2 Services links, got ${count}`);
  if (h === before) throw new Error(`${page}: unchanged`);
  fs.writeFileSync(root + page, h);
}
console.log('ok');
```

Expected output: `ok`.

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `node --test tests/site.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)|^✖"`
Expected: `ℹ fail 0`.

- [ ] **Step 7: Commit**

```bash
git add index.html resume.html contact.html case-cor-jesu-law.html case-norbert-retrofit.html case-project-derisk.html tests/site.test.mjs
git commit -q -m "Add Services between Resume and Contact in every nav and footer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Page shell, brand tokens, brand bar and hero

**Files:**
- Create: `services.html`
- Modify: `styles.css` (append the HannBuilders block at the end of the file)
- Test: `tests/site.test.mjs`

**Interfaces:**
- Consumes: nav/footer link order from Task 1.
- Produces: `<main class="hb" id="hb">` wrapper; element ids used later: `#hb-hero-service` (select), `#hb-hero-location` (input), `#hb-continue` (button), `#hb-ask-form`, `#hb-a-question`, `#hb-a-contact`, `#hb-a-status`, `#hb-tab-quote`, `#hb-tab-ask`, `#hb-pane-quote`, `#hb-pane-ask`, `.hb-chip[data-path]`, `#hb-answer`; section anchors `#services #process #projects #about #faq #quote` (later tasks fill them); CSS classes `hb-pill`, `hb-pill--dark`, `hb-pill--orange`, `hb-pill--ghost`, `hb-ar`, `hb-tag`, `hb-ic`, `hb-reveal`; CSS custom properties `--hb-nav-h` and `--hb-bar-h` set on `<html>` by script.

- [ ] **Step 1: Write the failing tests**

Append to `tests/site.test.mjs`:

```js
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
  assert.ok(block.length > 100, 'HannBuilders block exists');
  const tokens = { '--hb-ink': '#1E2124', '--hb-ink-2': '#4A4E53', '--hb-muted': '#6B6F74', '--hb-bg': '#F4F2EE', '--hb-panel': '#FFFFFF', '--hb-stone': '#E7E4DE', '--hb-line': '#DCD8D0', '--hb-orange': '#E2621B', '--hb-orange-deep': '#B44912', '--hb-orange-soft': '#FBE9DE', '--hb-orange-light': '#F0884F' };
  for (const [name, value] of Object.entries(tokens)) assert.match(block, new RegExp(`${name}:${value};`), name);
  // Every selector in the block is scoped to the page.
  const selectors = [...block.matchAll(/(?:^|\})\s*([^@{}][^{}]*)\{/g)].map((m) => m[1].trim()).filter((s) => s && !s.startsWith('/*') && !/^(from|to|\d+%)$/.test(s));
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
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test tests/site.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)|^✖"`
Expected: the four new tests fail (services.html missing).

- [ ] **Step 3: Create `services.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Services · HannBuilders by Hanny Gravino</title>
<meta name="description" content="HannBuilders: design-and-build, seismic retrofit and project management in the Philippines, led by PMP-certified structural engineer Hanny Gravino. Remote PM, design and estimating worldwide.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
<script>document.documentElement.classList.add('hb-js');</script>
</head>
<body>
<div id="top"></div>

<header class="site-nav">
  <div class="wrap nav-inner">
    <a class="wordmark" href="index.html#top">H. Gravino</a>
    <nav aria-label="Main">
      <ul class="nav-links">
        <li><a href="index.html#work">Work</a></li>
        <li><a href="resume.html">Resume</a></li>
        <li><a href="services.html" aria-current="page">Services</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
    </nav>
  </div>
</header>

<main class="hb" id="hb">
  <div class="hb-bar">
    <div class="wrap hb-bar-inner">
      <a class="hb-mark" href="#hb" aria-label="HannBuilders, top of services">
        <svg width="28" height="28" viewBox="0 0 26 26" fill="none" stroke-width="2.2" aria-hidden="true"><rect x="3" y="3" width="20" height="20" rx="3" stroke="#1E2124"/><path d="M8 3v20M18 3v20M8 13h10" stroke="#E2621B"/></svg>
        <span>HANN<small>BUILDERS</small></span>
      </a>
      <nav class="hb-links" aria-label="HannBuilders"><a href="#services">Services</a><a href="#process">How we work</a><a href="#projects">Projects</a><a href="#about">About</a><a href="#faq">FAQ</a></nav>
      <a class="hb-pill hb-pill--dark" href="#quote">Request a quote <span class="hb-ar" aria-hidden="true">&rarr;</span></a>
    </div>
  </div>

  <section class="hb-hero-wrap" aria-labelledby="hb-title">
    <div class="hb-hero">
      <div class="hb-hero-left hb-reveal">
        <span class="hb-tag">Founder-led &middot; Mindanao, Philippines &middot; Remote services worldwide</span>
        <h1 id="hb-title">Build, retrofit or plan it <em>with an engineer</em> beside you.</h1>
        <p class="hb-lead">Design-and-build, seismic retrofit and project management, led by a PMP-certified structural engineer. Ask us anything: there's no obligation.</p>
        <div class="hb-ctas">
          <a class="hb-pill hb-pill--orange" href="#quote">Request a quote <span class="hb-ar" aria-hidden="true">&rarr;</span></a>
          <a class="hb-pill hb-pill--ghost" href="#services">See our services</a>
        </div>
        <p class="hb-contact"><a href="mailto:hannygravino.ph@gmail.com"><span aria-hidden="true">&#9993;&nbsp;</span>hannygravino.ph@gmail.com</a><a href="tel:+639473245278"><span aria-hidden="true">&#9742;&nbsp;</span>+63 947 324 5278</a></p>
        <div class="hb-paths">
          <p class="hb-paths-label" id="hb-paths-label">What brings you here?</p>
          <div class="hb-chips" role="group" aria-labelledby="hb-paths-label">
            <button class="hb-chip" type="button" aria-pressed="false" data-path="build"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/></svg>Planning a new building</button>
            <button class="hb-chip" type="button" aria-pressed="false" data-path="damage"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h3l2-5 4 10 2-5h7"/></svg>My building was damaged</button>
            <button class="hb-chip" type="button" aria-pressed="false" data-path="pm"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/></svg>I need a project manager</button>
            <button class="hb-chip" type="button" aria-pressed="false" data-path="boq"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h2"/></svg>I need estimates or a BOQ</button>
          </div>
          <p class="hb-answer" id="hb-answer" aria-live="polite" hidden></p>
        </div>
        <div class="hb-recent">
          <p class="hb-recent-label">Recent work by our founder</p>
          <div class="hb-recent-grid">
            <a class="hb-mini" href="case-cor-jesu-law.html"><img src="assets/cases/cor-jesu-law/architect-perspective.jpg" alt="" width="74" height="56"><span><b>Center for Law and Graduate Studies</b><span>4,970 m&sup2; near a fault <i aria-hidden="true">&rarr;</i></span></span></a>
            <a class="hb-mini" href="case-norbert-retrofit.html"><img src="assets/cases/norbert-retrofit/building-exterior.jpg" alt="" width="74" height="56"><span><b>Norbert Building Retrofit</b><span>6 storeys after a 6.3 quake <i aria-hidden="true">&rarr;</i></span></span></a>
          </div>
        </div>
      </div>

      <div class="hb-hero-right hb-reveal" style="--hb-d:.12s">
        <figure class="hb-hero-photo"><img src="assets/cases/norbert-retrofit/building-scaffold.jpg" alt="The six-storey Norbert Building in scaffolding during its seismic retrofit" width="900" height="1200" fetchpriority="high"><figcaption>Norbert Building retrofit, Digos City</figcaption></figure>
        <div class="hb-card">
          <div class="hb-tabs" role="tablist" aria-label="Enquiry type">
            <span class="hb-slider" aria-hidden="true"></span>
            <button class="hb-tab" type="button" role="tab" id="hb-tab-quote" aria-controls="hb-pane-quote" aria-selected="true">Request a quote</button>
            <button class="hb-tab" type="button" role="tab" id="hb-tab-ask" aria-controls="hb-pane-ask" aria-selected="false" tabindex="-1">Ask a question</button>
          </div>
          <div class="hb-pane" id="hb-pane-quote" role="tabpanel" aria-labelledby="hb-tab-quote">
            <label class="hb-label" for="hb-hero-service">What do you need?</label>
            <select class="hb-input" id="hb-hero-service">
              <option value="">Choose a service&hellip;</option>
              <option>Design and build</option><option>Seismic assessment and retrofit</option><option>Construction management</option>
              <option>Project management</option><option>Structural design and analysis</option><option>Cost estimating, BOQ and BOM</option><option>Not sure yet</option>
            </select>
            <label class="hb-label" for="hb-hero-location">Where is the project?</label>
            <input class="hb-input" id="hb-hero-location" type="text" placeholder="City or province, or &lsquo;remote&rsquo;" autocomplete="address-level2">
            <button class="hb-pill hb-pill--dark hb-pill--block" type="button" id="hb-continue">Continue to full request <span class="hb-ar" aria-hidden="true">&rarr;</span></button>
          </div>
          <form class="hb-pane" id="hb-pane-ask" role="tabpanel" aria-labelledby="hb-tab-ask" hidden action="https://api.web3forms.com/submit" method="POST" novalidate>
            <input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY">
            <input type="hidden" name="subject" value="HannBuilders question">
            <input type="checkbox" name="botcheck" class="hb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
            <label class="hb-label" for="hb-a-question">Your question</label>
            <textarea class="hb-input" id="hb-a-question" name="message" rows="2" required aria-describedby="hb-a-question-err" placeholder="e.g. Can you check if my building needs a retrofit?"></textarea>
            <p class="hb-err" id="hb-a-question-err" hidden>Please type your question.</p>
            <label class="hb-label" for="hb-a-contact">Email or phone</label>
            <input class="hb-input" id="hb-a-contact" name="contact" type="text" required aria-describedby="hb-a-contact-err" autocomplete="email" placeholder="So we can reply">
            <p class="hb-err" id="hb-a-contact-err" hidden>Please add an email or phone number.</p>
            <button class="hb-pill hb-pill--dark hb-pill--block" type="submit">Send question <span class="hb-ar" aria-hidden="true">&rarr;</span></button>
            <p class="hb-small">Just a question? That's fine. No quote needed.</p>
            <p class="hb-status" id="hb-a-status" role="status" aria-live="polite"></p>
          </form>
        </div>
      </div>
    </div>
  </section>

  <!-- Task 3 inserts: trust row, services, process, projects, why, founder, FAQ -->
  <!-- Task 4 inserts: request a quote -->
</main>

<footer class="site-foot">
  <div class="wrap foot-inner">
    <span>&copy; Hanny Creselle B. Gravino &middot; Civil Engineer &amp; Project Manager</span>
    <nav aria-label="Footer">
      <ul class="foot-links">
        <li><a href="index.html#work">Work</a></li>
        <li><a href="resume.html">Resume</a></li>
        <li><a href="services.html" aria-current="page">Services</a></li>
        <li><a href="contact.html">Contact</a></li>
        <li><a href="#top">Back to top</a></li>
      </ul>
    </nav>
  </div>
</footer>
<script>
(() => {
  // The site nav and the HannBuilders bar are both sticky: pin the bar under the nav and offset anchor jumps by both.
  const root = document.documentElement;
  const nav = document.querySelector('.site-nav');
  const bar = document.querySelector('.hb-bar');
  const measure = () => {
    root.style.setProperty('--hb-nav-h', nav.offsetHeight + 'px');
    root.style.setProperty('--hb-bar-h', bar.offsetHeight + 'px');
  };
  measure();
  window.addEventListener('resize', measure);
  if (document.fonts) document.fonts.ready.then(measure);
})();
</script>
</body>
</html>
```

Note: check the real pixel size of `building-scaffold.jpg` (`python -c "import pymupdf;p=pymupdf.Pixmap('assets/cases/norbert-retrofit/building-scaffold.jpg');print(p.width,p.height)"`) and use those numbers in its `width`/`height` attributes; do the same for the two mini thumbnails if you switch to their `-thumb` versions.

- [ ] **Step 4: Append the HannBuilders block to `styles.css`**

Append at the very end of `styles.css`:

```css

/* ===== HannBuilders services page ===== */
/* Scoped brand: charcoal + safety orange, used calmly. Every selector here starts with .hb or html:has(.hb). */
.hb{
  --hb-ink:#1E2124; --hb-ink-2:#4A4E53; --hb-muted:#6B6F74; --hb-bg:#F4F2EE; --hb-panel:#FFFFFF; --hb-stone:#E7E4DE; --hb-line:#DCD8D0;
  --hb-orange:#E2621B; --hb-orange-deep:#B44912; --hb-orange-soft:#FBE9DE; --hb-orange-light:#F0884F;
  --hb-ease:cubic-bezier(0.2, 0, 0, 1);
  display:block; background:var(--hb-bg); color:var(--hb-ink); padding-bottom:72px;
}
html:has(.hb){scroll-padding-top:calc(var(--hb-nav-h, 64px) + var(--hb-bar-h, 66px) + 16px);}
.hb h1, .hb h2, .hb h3{font-family:var(--font-display); font-stretch:88%; font-weight:800; color:var(--hb-ink); letter-spacing:-0.01em; margin:0;}
.hb a{color:inherit;}
.hb :focus-visible{outline:3px solid var(--hb-orange); outline-offset:3px;}

/* Brand bar */
.hb .hb-bar{position:sticky; top:var(--hb-nav-h, 64px); z-index:9; background:rgba(244,242,238,.94); backdrop-filter:blur(8px); border-bottom:1px solid var(--hb-line);}
.hb .hb-bar-inner{display:flex; align-items:center; justify-content:space-between; gap:20px; min-height:66px;}
.hb .hb-mark{display:flex; align-items:center; gap:10px; text-decoration:none; font-family:var(--font-display); font-weight:800; font-size:20px; letter-spacing:.02em; color:var(--hb-ink);}
.hb .hb-mark small{font-size:inherit; font-weight:500; color:var(--hb-orange-deep);}
.hb .hb-links{display:flex; gap:26px; font-size:14px;}
.hb .hb-links a{color:var(--hb-ink-2); text-decoration:none;}
.hb .hb-links a:hover{color:var(--hb-ink);}

/* Pills and small parts */
.hb .hb-pill{display:inline-flex; align-items:center; justify-content:center; gap:10px; min-height:44px; padding:10px 12px 10px 20px; border:0; border-radius:999px; font:600 14px var(--font-body); text-decoration:none; cursor:pointer; transition:background-color .2s, box-shadow .2s;}
.hb .hb-pill:hover{box-shadow:0 6px 18px rgba(30,33,36,.16);}
.hb .hb-ar{width:26px; height:26px; border-radius:50%; display:inline-grid; place-items:center; font-size:13px; transition:transform .2s var(--hb-ease);}
.hb .hb-pill:hover .hb-ar{transform:translateX(3px) rotate(-45deg);}
.hb .hb-pill--dark{background:var(--hb-ink); color:var(--hb-bg);}
.hb .hb-pill--dark .hb-ar{background:var(--hb-orange); color:var(--hb-ink);}
.hb .hb-pill--orange{background:var(--hb-orange); color:var(--hb-ink);}
.hb .hb-pill--orange .hb-ar{background:var(--hb-ink); color:var(--hb-bg);}
.hb .hb-pill--ghost{background:transparent; color:var(--hb-bg); border:1.5px solid rgba(244,242,238,.45); padding:10px 20px;}
.hb .hb-pill--ghost:hover{background:rgba(244,242,238,.08); box-shadow:none;}
.hb .hb-pill--block{width:100%; margin-top:14px;}
.hb .hb-tag{display:inline-block; font-size:12.5px; font-weight:600; padding:6px 12px; border-radius:999px; background:var(--hb-stone); color:var(--hb-ink-2);}
.hb .hb-ic{width:44px; height:44px; border-radius:12px; background:var(--hb-orange-soft); display:grid; place-items:center; transition:background-color .25s;}
.hb .hb-ic svg{width:22px; height:22px; stroke:var(--hb-orange-deep); fill:none; stroke-width:1.7; transition:stroke .25s;}
.hb .hb-hp{position:absolute; left:-9999px;}

/* Hero */
.hb .hb-hero-wrap{padding:22px max(20px, env(safe-area-inset-left, 0px)) 0;}
.hb .hb-hero{max-width:1208px; margin:0 auto; border-radius:24px; background:var(--hb-ink); color:var(--hb-bg); padding:48px; display:grid; grid-template-columns:1.05fr .95fr; gap:36px;}
.hb .hb-hero-left{display:flex; flex-direction:column; align-items:flex-start;}
.hb .hb-hero-left .hb-tag{background:rgba(244,242,238,.12); color:var(--hb-bg);}
.hb .hb-hero h1{color:var(--hb-bg); font-size:clamp(36px, 4.4vw, 56px); line-height:1.02; margin:18px 0 16px;}
.hb .hb-hero h1 em{font-style:normal; color:var(--hb-orange-light);}
.hb .hb-lead{font-size:17px; line-height:1.6; color:#CFCDC8; max-width:40ch; margin:0 0 26px;}
.hb .hb-ctas{display:flex; gap:12px; flex-wrap:wrap;}
.hb .hb-contact{display:flex; gap:24px; flex-wrap:wrap; margin:28px 0 0; font-size:14px;}
.hb .hb-contact a{color:#CFCDC8; text-decoration:none; border-bottom:1px solid rgba(207,205,200,.35);}
.hb .hb-contact a:hover{color:var(--hb-bg);}
.hb .hb-paths{margin-top:auto; padding-top:34px; width:100%;}
.hb .hb-paths-label{font-size:13px; font-weight:600; color:#CFCDC8; margin:0 0 10px;}
.hb .hb-chips{display:flex; flex-wrap:wrap; gap:8px;}
.hb .hb-chip{display:inline-flex; align-items:center; gap:8px; min-height:40px; border:1px solid rgba(244,242,238,.22); background:rgba(244,242,238,.04); color:var(--hb-bg); font:500 14px var(--font-body); padding:9px 14px; border-radius:999px; cursor:pointer; transition:background-color .2s, border-color .2s, transform .2s var(--hb-ease);}
.hb .hb-chip svg{width:16px; height:16px; stroke:var(--hb-orange-light); fill:none; stroke-width:1.8; flex:none;}
.hb .hb-chip:hover{background:rgba(244,242,238,.10); border-color:rgba(244,242,238,.4); transform:translateY(-2px);}
.hb .hb-chip[aria-pressed="true"]{background:var(--hb-orange); border-color:var(--hb-orange); color:var(--hb-ink);}
.hb .hb-chip[aria-pressed="true"] svg{stroke:var(--hb-ink);}
.hb .hb-answer{margin:12px 0 0; font-size:14px; color:#CFCDC8;}
.hb .hb-answer b{color:var(--hb-bg);}
.hb .hb-answer a{color:var(--hb-orange-light); font-weight:600; text-decoration:none; white-space:nowrap;}
.hb .hb-answer a:hover{text-decoration:underline;}
.hb .hb-recent{margin-top:22px; width:100%;}
.hb .hb-recent-label{font-size:12px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#9E9C97; margin:0 0 10px;}
.hb .hb-recent-grid{display:grid; grid-template-columns:1fr 1fr; gap:10px;}
.hb .hb-mini{display:grid; grid-template-columns:74px 1fr; gap:12px; align-items:center; padding:8px; border-radius:14px; background:rgba(244,242,238,.06); border:1px solid rgba(244,242,238,.10); color:var(--hb-bg); text-decoration:none; transition:background-color .2s, transform .2s var(--hb-ease);}
.hb .hb-mini:hover{background:rgba(244,242,238,.11); transform:translateY(-2px);}
.hb .hb-mini img{width:74px; height:56px; object-fit:cover; border-radius:10px;}
.hb .hb-mini b{display:block; font-size:13.5px; line-height:1.25;}
.hb .hb-mini span span{font-size:12px; color:#B8B6B0;}
.hb .hb-mini i{font-style:normal; color:var(--hb-orange-light); display:inline-block; transition:transform .2s;}
.hb .hb-mini:hover i{transform:translateX(3px);}
.hb .hb-hero-right{display:flex; flex-direction:column; gap:14px;}
.hb .hb-hero-photo{margin:0; border-radius:16px; overflow:hidden; position:relative; max-height:380px; flex:1; min-height:180px;}
.hb .hb-hero-photo img{width:100%; height:100%; object-fit:cover;}
.hb .hb-hero-photo figcaption{position:absolute; left:12px; bottom:12px; font-size:12px; color:var(--hb-bg); background:rgba(30,33,36,.7); padding:5px 10px; border-radius:999px;}

/* Enquiry card, tabs and inputs (also used by the quote form in Task 4) */
.hb .hb-card{background:var(--hb-panel); color:var(--hb-ink); border-radius:16px; padding:18px; box-shadow:0 18px 40px rgba(0,0,0,.22);}
.hb .hb-tabs{position:relative; display:flex; background:var(--hb-stone); border-radius:999px; padding:4px; margin-bottom:6px;}
.hb .hb-tab{position:relative; z-index:1; flex:1; min-height:36px; border:0; background:none; border-radius:999px; font:600 13px var(--font-body); color:var(--hb-ink-2); cursor:pointer; transition:color .2s;}
.hb .hb-tab[aria-selected="true"]{color:var(--hb-ink);}
.hb .hb-slider{position:absolute; top:4px; bottom:4px; left:4px; width:calc(50% - 4px); background:#fff; border-radius:999px; box-shadow:0 1px 4px rgba(0,0,0,.14); transition:transform .28s var(--hb-ease);}
.hb .hb-tabs[data-tab="ask"] .hb-slider{transform:translateX(100%);}
.hb .hb-label{display:block; font-size:12.5px; font-weight:600; color:var(--hb-ink-2); margin:12px 0 5px;}
.hb .hb-input{width:100%; border:1px solid var(--hb-line); border-radius:10px; padding:10px 12px; font:15px var(--font-body); color:var(--hb-ink); background:#fff; transition:border-color .2s, box-shadow .2s;}
.hb .hb-input:focus{outline:none; border-color:var(--hb-orange); box-shadow:0 0 0 3px rgba(226,98,27,.22);}
.hb .hb-input[aria-invalid="true"]{border-color:#B3261E;}
.hb .hb-err{margin:4px 0 0; font-size:12.5px; color:#B3261E;}
.hb .hb-small{font-size:12px; color:var(--hb-muted); margin:10px 0 0; text-align:center;}
.hb .hb-status{margin:10px 0 0; font-size:13.5px; color:var(--hb-ink-2);}
.hb .hb-status:empty{display:none;}
.hb .hb-status[data-kind="error"]{color:#B3261E;}
.hb .hb-status[data-kind="success"]{color:#1D6B36;}

@media (max-width:900px){
  .hb .hb-links{display:none;}
  .hb .hb-hero{grid-template-columns:1fr; padding:32px 24px;}
}
@media (max-width:640px){
  .hb .hb-hero-wrap{padding-inline:12px;}
  .hb .hb-hero{padding:26px 18px; border-radius:18px;}
  .hb .hb-recent-grid{grid-template-columns:1fr;}
  .hb .hb-mark span{font-size:17px;}
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node --test tests/site.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)|^✖"`
Expected: `ℹ fail 0`. If the scoped-selector test names a selector, prefix it with `.hb `.

- [ ] **Step 6: Commit**

```bash
git add services.html styles.css tests/site.test.mjs
git commit -q -m "Add the HannBuilders services page shell, brand bar and hero" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Trust row, services, process, projects, why, founder and FAQ

**Files:**
- Modify: `services.html` (replace the comment `<!-- Task 3 inserts: trust row, services, process, projects, why, founder, FAQ -->`)
- Modify: `styles.css` (append inside the HannBuilders block, before its media queries is not required; append at the end)
- Test: `tests/site.test.mjs`

**Interfaces:**
- Consumes: `.hb-reveal`, `.hb-ic`, `.hb-tag`, `.hb-pill*` from Task 2.
- Produces: anchors `#services #process #projects #about #faq`; FAQ buttons `button.hb-ask-link` (Task 4 wires them to the Ask tab); figures `b[data-count]` (Task 5 counts them up); hover targets `.hb-t`, `.hb-s`, `.hb-pc` (Task 5 adds motion).

- [ ] **Step 1: Write the failing tests**

Append to `tests/site.test.mjs`:

```js
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
  assert.match(html, /<h2>Hi, I'm Hanny Gravino\.<\/h2>/);
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
```

Note: the `quote` id is created in Task 4; this task's order test will fail on `quote` until then, so in Step 4 below the expected result is "all pass except `services sections appear in order`", which Task 4 completes.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test tests/site.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)|^✖"`
Expected: the four new tests fail.

- [ ] **Step 3: Insert the sections into `services.html`**

Replace `  <!-- Task 3 inserts: trust row, services, process, projects, why, founder, FAQ -->` with:

```html
  <div class="wrap">
    <ul class="hb-trust" aria-label="Why clients trust us">
      <li class="hb-t hb-reveal"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg><div><b>PMP-certified</b><span>one accountable lead, start to finish</span></div></li>
      <li class="hb-t hb-reveal" style="--hb-d:.08s"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/></svg><div><b>NSCP / NBCP</b><span>code-compliant structural design</span></div></li>
      <li class="hb-t hb-reveal" style="--hb-d:.16s"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h3l2-5 4 10 2-5h7"/></svg><div><b>Seismic expertise</b><span>design and retrofit near active faults</span></div></li>
      <li class="hb-t hb-reveal" style="--hb-d:.24s"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg><div><b>Clear costs</b><span>BOQ, BOM and weekly reports</span></div></li>
    </ul>
  </div>

  <section class="hb-section" id="services" aria-labelledby="hb-services-title"><div class="wrap">
    <div class="hb-head hb-reveal"><div><span class="hb-tag">What we do</span><h2 id="hb-services-title">Services for owners and for project teams</h2></div><p>Building or strengthening in the Philippines? We design, plan and deliver it. Need engineering or project support anywhere? We work with you remotely.</p></div>

    <p class="hb-group hb-reveal">For owners &middot; building and retrofit in the Philippines</p>
    <div class="hb-svc" aria-label="For owners">
      <article class="hb-s hb-reveal"><div class="hb-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/></svg></div><h3>Design and build</h3><p>Schools, commercial and residential buildings, taken from structural design to handover by one team.</p><ul><li>Structural design and drawings</li><li>Cost estimate, BOQ and BOM</li><li>Construction and handover</li></ul></article>
      <article class="hb-s hb-reveal" style="--hb-d:.08s"><div class="hb-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h3l2-5 4 10 2-5h7"/></svg></div><h3>Seismic assessment and retrofit</h3><p>For buildings damaged by an earthquake or built before current codes: find out what's wrong and fix it.</p><ul><li>Damage assessment and site investigation</li><li>ETABS analysis and retrofit design</li><li>Jacketing, steel frames and dampers</li></ul></article>
      <article class="hb-s hb-reveal" style="--hb-d:.16s"><div class="hb-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 20V10l6-4 6 4v10"/><circle cx="12" cy="13" r="2"/></svg></div><h3>Construction management</h3><p>Contractors, suppliers and the site kept on schedule and on budget, with you informed every week.</p><ul><li>Contractor and supplier coordination</li><li>Site supervision and quality checks</li><li>Weekly cost and schedule reports</li></ul></article>
    </div>

    <p class="hb-group hb-reveal">For project teams &middot; delivered on site or remotely</p>
    <div class="hb-svc" aria-label="For project teams">
      <article class="hb-s hb-reveal"><div class="hb-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5M7 14h4M7 17h7"/></svg></div><h3>Project management <span class="hb-remote">Remote</span></h3><p>PMP-standard planning and control for your project.</p><ul><li>Gantt and S-curve scheduling</li><li>Procurement planning</li><li>Cost control and reporting</li></ul></article>
      <article class="hb-s hb-reveal" style="--hb-d:.08s"><div class="hb-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V8l8-4 8 4v12"/><path d="M4 12h16M4 16h16M9 8v12M15 8v12"/></svg></div><h3>Structural design and analysis <span class="hb-remote">Remote</span></h3><p>Calculations and drawings to NSCP and NBCP.</p><ul><li>ETABS modelling and analysis</li><li>Foundations in VisualFoundation</li><li>AutoCAD drawings, SketchUp models</li></ul></article>
      <article class="hb-s hb-reveal" style="--hb-d:.16s"><div class="hb-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h2M16 11v4"/></svg></div><h3>Cost estimating, BOQ and BOM <span class="hb-remote">Remote</span></h3><p>Quantities and estimates you can tender and build from.</p><ul><li>Quantity take-offs from drawings</li><li>Bills of quantities and materials</li><li>Estimating templates and workflows</li></ul></article>
    </div>
  </div></section>

  <section class="hb-section" id="process" aria-labelledby="hb-process-title"><div class="wrap">
    <div class="hb-head hb-reveal"><div><span class="hb-tag">How we work</span><h2 id="hb-process-title">From first conversation to handover</h2></div><p>Five clear steps. You always know what happens next, what it costs and who to call.</p></div>
    <div class="hb-process">
      <figure class="hb-proc-photo hb-reveal"><img src="assets/cases/norbert-retrofit/board-site-visit.jpg" alt="Hanny walking the college board through the Norbert Building retrofit on site" width="1200" height="900" loading="lazy"><figcaption>Walking the college board through the Norbert retrofit on site.</figcaption></figure>
      <ol class="hb-steps">
        <li class="hb-step hb-reveal"><span class="hb-step-num">01</span><div><h3>Talk it through</h3><p>Tell us about the site, the goal, the budget and the timeline. Questions are welcome; there's no obligation.</p></div></li>
        <li class="hb-step hb-reveal" style="--hb-d:.06s"><span class="hb-step-num">02</span><div><h3>Assess and design</h3><p>Site investigation, structural analysis and drawings, checked against NSCP and NBCP.</p></div></li>
        <li class="hb-step hb-reveal" style="--hb-d:.12s"><span class="hb-step-num">03</span><div><h3>Estimate and plan</h3><p>A cost estimate with BOQ and BOM, and a schedule with Gantt chart and S-curve, before anything is built.</p></div></li>
        <li class="hb-step hb-reveal" style="--hb-d:.18s"><span class="hb-step-num">04</span><div><h3>Build or manage</h3><p>We build, or manage the contractors and suppliers for you, with weekly cost and schedule reports.</p></div></li>
        <li class="hb-step hb-reveal" style="--hb-d:.24s"><span class="hb-step-num">05</span><div><h3>Hand over</h3><p>Completed works, records and drawings handed over, with every change documented.</p></div></li>
      </ol>
    </div>
  </div></section>

  <section class="hb-section" id="projects" aria-labelledby="hb-projects-title"><div class="wrap">
    <div class="hb-head hb-reveal"><div><span class="hb-tag">Track record</span><h2 id="hb-projects-title">Projects led by our founder</h2></div><p>Delivered by Hanny Gravino before founding HannBuilders. Each case shows the problem, the engineering and the result.</p></div>
    <div class="hb-proj">
      <a class="hb-pc hb-reveal" href="case-cor-jesu-law.html"><div class="hb-pc-photo"><img src="assets/cases/cor-jesu-law/architect-perspective.jpg" alt="Architect's perspective of the Center for Law and Graduate Studies" width="1200" height="675" loading="lazy"></div><div class="hb-pc-body"><p class="hb-meta">Digos City &middot; 2020 to 2021</p><h3>Center for Law and Graduate Studies</h3><div class="hb-figs"><div><b data-count="4970" data-suffix=" m&sup2;">4,970 m&sup2;</b><span>floor area</span></div><div><b data-count="182" data-suffix=" m">182 m</b><span>from an active fault</span></div></div><span class="hb-more">Read the full case <i aria-hidden="true">&rarr;</i></span></div></a>
      <a class="hb-pc hb-reveal" href="case-norbert-retrofit.html" style="--hb-d:.1s"><div class="hb-pc-photo"><img src="assets/cases/norbert-retrofit/building-exterior.jpg" alt="The Norbert Building after its retrofit" width="1200" height="675" loading="lazy"></div><div class="hb-pc-body"><p class="hb-meta">Digos City &middot; 2021 to 2023</p><h3>Norbert Building Retrofit</h3><div class="hb-figs"><div><b data-count="6">6</b><span>storeys retrofitted</span></div><div><b data-count="6.3" data-dec="1">6.3</b><span>magnitude earthquake</span></div></div><span class="hb-more">Read the full case <i aria-hidden="true">&rarr;</i></span></div></a>
    </div>
    <p class="hb-fine hb-reveal">Projects delivered while working with WMCabardo Engineering &amp; Consulting and ADRA Constructions Corporation.</p>
  </div></section>

  <section class="hb-section" id="why" aria-labelledby="hb-why-title"><div class="wrap">
    <div class="hb-head hb-reveal"><div><span class="hb-tag">Why HannBuilders</span><h2 id="hb-why-title">What you can count on</h2></div></div>
    <div class="hb-why">
      <div class="hb-w hb-reveal"><div class="hb-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h3l2-5 4 10 2-5h7"/></svg></div><h3>Built for earthquakes</h3><p>Experience designing 182 m from the Digos Fault and retrofitting a building after a 6.3-magnitude earthquake.</p></div>
      <div class="hb-w hb-reveal" style="--hb-d:.08s"><div class="hb-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg></div><h3>Costs you can see</h3><p>BOQ and BOM up front, weekly cost and schedule reports, and every deviation documented with photographs.</p></div>
      <div class="hb-w hb-reveal" style="--hb-d:.16s"><div class="hb-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></div><h3>One accountable lead</h3><p>A PMP-certified structural engineer runs your project from the first call to handover.</p></div>
    </div>
  </div></section>

  <section class="hb-section" id="about" aria-labelledby="hb-about-title"><div class="wrap">
    <div class="hb-founder hb-reveal">
      <div class="hb-fphotos"><div class="hb-fphoto-a"><img src="assets/hero-site.jpg" alt="Hanny Gravino on site, facing the new steel frames of a seismic retrofit" width="1041" height="590" loading="lazy"></div><div class="hb-fphoto-b"><img src="assets/headshot.jpg" alt="Portrait of Hanny Gravino" width="520" height="650" loading="lazy"></div></div>
      <div>
        <span class="hb-tag">Meet the founder</span>
        <h2 id="hb-about-title">Hi, I'm Hanny Gravino.</h2>
        <p>I'm a PMP-certified project manager and structural engineer. I've designed seismic-resistant buildings and led retrofits in Digos City, and I now support estimating teams in Queensland, Australia.</p>
        <p>I started HannBuilders so owners get an engineer who explains things plainly, plans before building, and reports honestly every week.</p>
        <div class="hb-logos"><img src="assets/issuers/pmi.png" alt="Project Management Institute" width="40" height="40" loading="lazy"><img src="assets/issuers/engineers-australia.png" alt="Engineers Australia" width="34" height="44" loading="lazy"><img src="assets/issuers/iet.png" alt="Institution of Engineering and Technology" width="48" height="42" loading="lazy"><img src="assets/issuers/asce.png" alt="American Society of Civil Engineers" width="48" height="16" loading="lazy"></div>
        <ul class="hb-ticks"><li>PMP</li><li>CAPM</li><li>MIEAust</li><li>MIET</li><li>M.ASCE</li></ul>
        <a class="hb-pill hb-pill--dark" href="resume.html">View full resume <span class="hb-ar" aria-hidden="true">&rarr;</span></a>
      </div>
    </div>
  </div></section>

  <section class="hb-section" id="faq" aria-labelledby="hb-faq-title"><div class="wrap">
    <div class="hb-faq">
      <div class="hb-reveal">
        <span class="hb-tag">FAQ</span>
        <h2 id="hb-faq-title" class="hb-faq-title">Questions people ask</h2>
        <div class="hb-askcard"><h3>Don't see yours?</h3><p>Ask anything, big or small. A short message is enough to start.</p><button class="hb-pill hb-pill--dark hb-ask-link" type="button">Ask a question <span class="hb-ar" aria-hidden="true">&rarr;</span></button></div>
      </div>
      <div class="hb-reveal" style="--hb-d:.08s">
        <details class="hb-q"><summary>Where do you work?</summary><p>Building and retrofit works are in the Philippines, starting in Mindanao. Project management, structural design and estimating can be delivered remotely to clients anywhere, including Australia.</p></details>
        <details class="hb-q"><summary>Which services can you do remotely?</summary><p>Project management, structural design and analysis, and cost estimating with BOQ and BOM. We work from your drawings and share models, schedules and reports online.</p></details>
        <details class="hb-q"><summary>What should I send for a quote?</summary><p>The location, the type and size of the project, your timeline and a budget range if you have one. Drawings or photos help, but they're not required to start.</p></details>
        <details class="hb-q"><summary>How does a quote work?</summary><p>We read your request, ask any questions and arrange a site visit if needed, then send a written scope and quote. There's no obligation to go ahead.</p></details>
        <details class="hb-q"><summary>Can you work with my architect or contractor?</summary><p>Yes. Coordinating architects, contractors and suppliers is part of how every project above was delivered.</p></details>
        <details class="hb-q"><summary>My building was damaged in an earthquake. Where do I start?</summary><p>Get in touch with photos of the damage. A damage assessment comes first, then a retrofit design and plan if it's needed.</p></details>
      </div>
    </div>
  </div></section>
```

Then check the real sizes of the images used here and correct their `width`/`height` attributes:

```bash
python -W ignore -c "
import pymupdf
for f in ['assets/cases/norbert-retrofit/board-site-visit.jpg','assets/cases/cor-jesu-law/architect-perspective.jpg','assets/cases/norbert-retrofit/building-exterior.jpg','assets/cases/norbert-retrofit/building-scaffold.jpg']:
    p=pymupdf.Pixmap(f); print(f,p.width,p.height)"
```

- [ ] **Step 4: Append section styles to the HannBuilders block in `styles.css`**

Append at the end of `styles.css`:

```css
/* Trust row */
.hb .hb-trust{list-style:none; margin:18px 0 0; padding:0; display:grid; grid-template-columns:repeat(4, 1fr); gap:14px;}
.hb .hb-t{background:var(--hb-panel); border-radius:16px; padding:16px 18px; display:flex; gap:12px; align-items:flex-start; position:relative; overflow:hidden;}
.hb .hb-t svg{flex:none; width:26px; height:26px; stroke:var(--hb-orange-deep); fill:none; stroke-width:1.7;}
.hb .hb-t b{display:block; font-size:14.5px; line-height:1.3;}
.hb .hb-t span{color:var(--hb-ink-2); font-size:13px;}

/* Sections */
.hb .hb-section{padding-top:88px;}
.hb .hb-head{display:flex; justify-content:space-between; align-items:flex-end; gap:24px; margin-bottom:30px;}
.hb .hb-head h2, .hb .hb-faq-title{font-size:clamp(28px, 3.2vw, 40px); line-height:1.08; margin-top:12px; max-width:20ch;}
.hb .hb-head > p{max-width:42ch; color:var(--hb-ink-2); margin:0;}
.hb .hb-group{font-family:var(--font-display); font-weight:700; font-size:15px; color:var(--hb-ink-2); margin:6px 0 12px; display:flex; align-items:center; gap:10px;}
.hb .hb-group::after{content:""; flex:1; height:1px; background:var(--hb-line);}
.hb .hb-svc{display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-bottom:26px;}
.hb .hb-s{background:var(--hb-panel); border-radius:18px; padding:24px; color:var(--hb-ink-2); font-size:15px;}
.hb .hb-s h3{font-size:20px; margin:16px 0 8px;}
.hb .hb-s p{margin:0;}
.hb .hb-s ul{margin:12px 0 0; padding:0; list-style:none; font-size:14px;}
.hb .hb-s li{padding-left:22px; position:relative; margin-top:6px;}
.hb .hb-s li::before{content:""; position:absolute; left:0; top:7px; width:12px; height:7px; border-left:2px solid var(--hb-orange-deep); border-bottom:2px solid var(--hb-orange-deep); transform:rotate(-45deg);}
.hb .hb-remote{display:inline-block; font:600 11.5px var(--font-body); padding:3px 9px; border-radius:999px; background:var(--hb-stone); color:var(--hb-ink-2); margin-left:6px; vertical-align:middle; font-stretch:100%;}

/* Process */
.hb .hb-process{display:grid; grid-template-columns:.9fr 1.1fr; gap:40px; align-items:start;}
.hb .hb-proc-photo{margin:0; border-radius:20px; overflow:hidden; position:sticky; top:calc(var(--hb-nav-h, 64px) + var(--hb-bar-h, 66px) + 20px);}
.hb .hb-proc-photo img{width:100%; aspect-ratio:4/3.3; object-fit:cover;}
.hb .hb-proc-photo figcaption{font-size:13px; color:var(--hb-muted); padding:10px 4px 0;}
.hb .hb-steps{list-style:none; margin:0; padding:0; display:grid; gap:12px;}
.hb .hb-step{background:var(--hb-panel); border-radius:18px; padding:20px 22px; display:grid; grid-template-columns:56px 1fr; gap:14px;}
.hb .hb-step-num{font-family:var(--font-display); font-weight:800; font-size:26px; line-height:1.1; color:var(--hb-orange-deep);}
.hb .hb-step h3{font-size:18px; margin-bottom:4px;}
.hb .hb-step p{margin:0; color:var(--hb-ink-2); font-size:14.5px;}

/* Projects */
.hb .hb-proj{display:grid; grid-template-columns:1fr 1fr; gap:20px;}
.hb .hb-pc{background:var(--hb-panel); border-radius:20px; overflow:hidden; text-decoration:none; color:inherit; display:block;}
.hb .hb-pc-photo{overflow:hidden; aspect-ratio:16/9;}
.hb .hb-pc-photo img{width:100%; height:100%; object-fit:cover;}
.hb .hb-pc-body{padding:22px 24px 24px;}
.hb .hb-meta{margin:0; font-size:12.5px; color:var(--hb-muted); letter-spacing:.06em; text-transform:uppercase;}
.hb .hb-pc h3{font-size:22px; margin:6px 0 14px;}
.hb .hb-figs{display:flex; gap:30px; border-top:1px solid var(--hb-line); padding-top:14px;}
.hb .hb-figs b{display:block; font-family:var(--font-display); font-size:24px; font-weight:800; font-variant-numeric:tabular-nums;}
.hb .hb-figs span{font-size:12.5px; color:var(--hb-muted);}
.hb .hb-more{display:inline-flex; gap:8px; margin-top:16px; font-weight:600; font-size:14px;}
.hb .hb-more i{font-style:normal;}
.hb .hb-fine{font-size:13px; color:var(--hb-muted); margin:14px 0 0;}

/* Why */
.hb .hb-why{display:grid; grid-template-columns:repeat(3, 1fr); gap:16px;}
.hb .hb-w{border-radius:18px; padding:26px; background:var(--hb-ink); color:#CFCDC8; font-size:15px;}
.hb .hb-w h3{color:var(--hb-bg); font-size:20px; margin:14px 0 8px;}
.hb .hb-w p{margin:0;}
.hb .hb-w .hb-ic{background:rgba(240,136,79,.16);}
.hb .hb-w .hb-ic svg{stroke:var(--hb-orange-light);}

/* Founder */
.hb .hb-founder{display:grid; grid-template-columns:.8fr 1.2fr; gap:44px; align-items:center; background:var(--hb-panel); border-radius:24px; padding:36px;}
.hb .hb-fphotos{position:relative; margin:0 22px 22px 0;}
.hb .hb-fphoto-a{border-radius:18px; overflow:hidden; aspect-ratio:4/4.4;}
.hb .hb-fphoto-a img{width:100%; height:100%; object-fit:cover;}
.hb .hb-fphoto-b{position:absolute; right:-22px; bottom:-22px; width:42%; border-radius:14px; overflow:hidden; border:5px solid #fff; box-shadow:0 12px 30px rgba(0,0,0,.18);}
.hb .hb-fphoto-b img{width:100%; height:auto;}
.hb .hb-founder h2{font-size:clamp(26px, 2.8vw, 36px); margin:12px 0 14px;}
.hb .hb-founder p{color:var(--hb-ink-2); margin:0 0 14px;}
.hb .hb-logos{display:flex; align-items:center; gap:22px; margin:20px 0 18px; flex-wrap:wrap;}
.hb .hb-logos img{height:34px; width:auto; filter:grayscale(1); opacity:.75; transition:filter .25s, opacity .25s;}
.hb .hb-logos img:hover{filter:none; opacity:1;}
.hb .hb-ticks{list-style:none; margin:0 0 22px; padding:0; display:flex; gap:18px; flex-wrap:wrap; font-size:14px; font-weight:600;}
.hb .hb-ticks li::before{content:"\2713"; color:var(--hb-orange-deep); margin-right:6px;}

/* FAQ */
.hb .hb-faq{display:grid; grid-template-columns:.8fr 1.2fr; gap:40px;}
.hb .hb-faq-title{margin:12px 0 20px;}
.hb .hb-askcard{background:var(--hb-orange-soft); border-radius:18px; padding:24px;}
.hb .hb-askcard h3{font-size:20px; margin:0 0 8px;}
.hb .hb-askcard p{color:var(--hb-ink-2); font-size:15px; margin:0 0 16px;}
.hb .hb-q{background:var(--hb-panel); border-radius:16px; padding:0 22px; margin-bottom:10px;}
.hb .hb-q summary{list-style:none; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:16px; padding:18px 0; min-height:44px; font-weight:600; font-size:16px;}
.hb .hb-q summary::-webkit-details-marker{display:none;}
.hb .hb-q summary::after{content:"+"; flex:none; width:28px; height:28px; border-radius:50%; background:var(--hb-stone); display:grid; place-items:center; font-weight:500; transition:transform .25s, background-color .25s;}
.hb .hb-q[open] summary::after{transform:rotate(45deg); background:var(--hb-orange-soft);}
.hb .hb-q p{margin:0; padding:0 0 18px; color:var(--hb-ink-2); font-size:15px;}

@media (max-width:900px){
  .hb .hb-svc, .hb .hb-why, .hb .hb-trust{grid-template-columns:1fr 1fr;}
  .hb .hb-process, .hb .hb-founder, .hb .hb-faq, .hb .hb-quote{grid-template-columns:1fr;}
  .hb .hb-proc-photo{position:static;}
  .hb .hb-head{flex-direction:column; align-items:flex-start;}
}
@media (max-width:640px){
  .hb .hb-svc, .hb .hb-why, .hb .hb-trust, .hb .hb-proj{grid-template-columns:1fr;}
  .hb .hb-section{padding-top:64px;}
  .hb .hb-founder{padding:22px;}
}
```

- [ ] **Step 5: Run the tests**

Run: `node --test tests/site.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)|^✖"`
Expected: everything passes except `services sections appear in order with their anchors` (it needs `#quote` from Task 4).

- [ ] **Step 6: Commit**

```bash
git add services.html styles.css tests/site.test.mjs
git commit -q -m "Add HannBuilders services, process, projects, founder and FAQ sections" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Quote form and all form behaviour (tabs, chips, continue, ask, submit)

**Files:**
- Modify: `services.html` (replace `<!-- Task 4 inserts: request a quote -->`; add a `<script>` before `</body>`)
- Modify: `styles.css` (append)
- Test: `tests/site.test.mjs`

**Interfaces:**
- Consumes: hero ids from Task 2 (`#hb-hero-service`, `#hb-hero-location`, `#hb-continue`, `#hb-pane-ask`, `#hb-a-question`, `#hb-a-contact`, `#hb-a-status`, `#hb-tab-quote`, `#hb-tab-ask`, `#hb-answer`, `.hb-chip[data-path]`); `button.hb-ask-link` from Task 3.
- Produces: `#quote` section; form `#hb-quote-form` with fields `#hb-q-service` (`name="service"`), `#hb-q-type`, `#hb-q-location`, `#hb-q-size`, `#hb-q-timeline`, `#hb-q-name`, `#hb-q-email`, `#hb-q-phone`, `#hb-q-message`, status `#hb-q-status`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/site.test.mjs`:

```js
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
  assert.match(js, /getElementById\('hb-continue'\)/);
  assert.match(js, /hb-q-service/);
  assert.match(js, /hb-q-location/);
  assert.match(js, /scrollIntoView/);
  assert.match(js, /ArrowRight/, 'tabs support arrow keys');
  assert.match(js, /\.hb-ask-link/, 'FAQ ask buttons open the Ask tab');
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test tests/site.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)|^✖"`
Expected: the three new tests and `services sections appear in order` fail.

- [ ] **Step 3: Insert the quote section**

Replace `  <!-- Task 4 inserts: request a quote -->` in `services.html` with:

```html
  <section class="hb-section" id="quote" aria-labelledby="hb-quote-title"><div class="wrap">
    <div class="hb-quote hb-reveal">
      <div>
        <span class="hb-tag hb-tag--dark">Request a quote</span>
        <h2 id="hb-quote-title">Tell us about your project</h2>
        <p>No obligation, and no question too small.</p>
        <ol class="hb-qsteps"><li><b>1</b>Send the form with whatever you know so far.</li><li><b>2</b>We reply with questions or a time to talk.</li><li><b>3</b>You get a written scope and quote.</li></ol>
        <p class="hb-contact"><a href="mailto:hannygravino.ph@gmail.com"><span aria-hidden="true">&#9993;&nbsp;</span>hannygravino.ph@gmail.com</a><a href="tel:+639473245278"><span aria-hidden="true">&#9742;&nbsp;</span>+63 947 324 5278</a></p>
      </div>
      <form class="hb-qform" id="hb-quote-form" action="https://api.web3forms.com/submit" method="POST" novalidate>
        <input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY">
        <input type="hidden" name="subject" value="HannBuilders quote">
        <input type="checkbox" name="botcheck" class="hb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="hb-full"><label class="hb-label" for="hb-q-service">Service</label>
          <select class="hb-input" id="hb-q-service" name="service" required aria-describedby="hb-q-service-err">
            <option value="">Choose a service&hellip;</option>
            <option>Design and build</option><option>Seismic assessment and retrofit</option><option>Construction management</option>
            <option>Project management</option><option>Structural design and analysis</option><option>Cost estimating, BOQ and BOM</option><option>Not sure yet</option>
          </select><p class="hb-err" id="hb-q-service-err" hidden>Please choose a service, or &ldquo;Not sure yet&rdquo;.</p></div>
        <div><label class="hb-label" for="hb-q-type">Project type</label>
          <select class="hb-input" id="hb-q-type" name="project_type"><option value="">Choose&hellip;</option><option>Residential</option><option>Commercial</option><option>School or institutional</option><option>Other</option></select></div>
        <div><label class="hb-label" for="hb-q-location">Location</label>
          <input class="hb-input" id="hb-q-location" name="location" type="text" required aria-describedby="hb-q-location-err" autocomplete="address-level2" placeholder="City or province, or remote"><p class="hb-err" id="hb-q-location-err" hidden>Please add a location, or &ldquo;remote&rdquo;.</p></div>
        <div><label class="hb-label" for="hb-q-size">Size or budget (optional)</label>
          <input class="hb-input" id="hb-q-size" name="size_or_budget" type="text" placeholder="e.g. 2 storeys, 300 m&sup2;"></div>
        <div><label class="hb-label" for="hb-q-timeline">Timeline (optional)</label>
          <select class="hb-input" id="hb-q-timeline" name="timeline"><option value="">Choose&hellip;</option><option>As soon as possible</option><option>Within 3 months</option><option>3 to 12 months</option><option>Just exploring</option></select></div>
        <div><label class="hb-label" for="hb-q-name">Your name</label>
          <input class="hb-input" id="hb-q-name" name="name" type="text" required aria-describedby="hb-q-name-err" autocomplete="name"><p class="hb-err" id="hb-q-name-err" hidden>Please enter your name.</p></div>
        <div><label class="hb-label" for="hb-q-email">Email</label>
          <input class="hb-input" id="hb-q-email" name="email" type="email" required aria-describedby="hb-q-email-err" autocomplete="email"><p class="hb-err" id="hb-q-email-err" hidden>Please enter a valid email address.</p></div>
        <div class="hb-full"><label class="hb-label" for="hb-q-phone">Phone (optional)</label>
          <input class="hb-input" id="hb-q-phone" name="phone" type="tel" autocomplete="tel"></div>
        <div class="hb-full"><label class="hb-label" for="hb-q-message">Tell us more</label>
          <textarea class="hb-input" id="hb-q-message" name="message" rows="4" required aria-describedby="hb-q-message-err" placeholder="What are you planning, and what would help you most?"></textarea><p class="hb-err" id="hb-q-message-err" hidden>Please tell us a little about the project.</p></div>
        <div class="hb-full"><button class="hb-pill hb-pill--orange" type="submit">Send request <span class="hb-ar" aria-hidden="true">&rarr;</span></button>
          <p class="hb-status" id="hb-q-status" role="status" aria-live="polite"></p></div>
      </form>
    </div>
  </div></section>
```

- [ ] **Step 4: Add the form script before `</body>`** (after the existing measure script)

```html
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const PLACEHOLDER = 'YOUR_WEB3FORMS_ACCESS_KEY';

  // Shared submit: validate trimmed values, show inline errors, then post to Web3Forms.
  function hbSubmit(form, checks, status, subject) {
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    const say = (text, kind) => { status.textContent = text; status.dataset.kind = kind; };
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      let firstBad = null;
      for (const [id, ok] of checks) {
        const input = $(id);
        const valid = ok(input.value.trim());
        input.setAttribute('aria-invalid', String(!valid));
        $(id + '-err').hidden = valid;
        if (!valid && !firstBad) firstBad = input;
      }
      if (firstBad) { firstBad.focus(); return; }
      if (form.access_key.value === PLACEHOLDER) {
        say('This form is not connected yet. Please email hannygravino.ph@gmail.com for now.', 'error');
        return;
      }
      if (subject) form.subject.value = subject();
      button.disabled = true;
      say('Sending…', 'info');
      try {
        const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.message || res.status);
        form.reset();
        checks.forEach(([id]) => $(id).removeAttribute('aria-invalid'));
        say('Thank you. We will reply soon.', 'success');
      } catch {
        say('Sorry, that did not send. Please try again or email hannygravino.ph@gmail.com.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  }
  const filled = (v) => v !== '';
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  hbSubmit(document.getElementById('hb-quote-form'),
    [['hb-q-service', filled], ['hb-q-location', filled], ['hb-q-name', filled], ['hb-q-email', isEmail], ['hb-q-message', filled]],
    $('hb-q-status'), () => 'HannBuilders quote: ' + ($('hb-q-service').value || 'Not sure yet'));
  hbSubmit(document.getElementById('hb-pane-ask'),
    [['hb-a-question', filled], ['hb-a-contact', filled]], $('hb-a-status'), null);

  // Enquiry tabs: click or arrow keys switch between "Request a quote" and "Ask a question".
  const tabs = [$('hb-tab-quote'), $('hb-tab-ask')];
  const tablist = tabs[0].parentElement;
  const select = (i, focus) => {
    tabs.forEach((tab, j) => {
      const on = i === j;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      $(tab.getAttribute('aria-controls')).hidden = !on;
    });
    tablist.dataset.tab = i === 1 ? 'ask' : 'quote';
    if (focus) tabs[i].focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i, false));
    tab.addEventListener('keydown', (event) => {
      const next = { ArrowRight: 1 - i, ArrowLeft: 1 - i, Home: 0, End: 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(next, true);
    });
  });

  // FAQ "Ask a question" buttons open the Ask tab in the hero card.
  document.querySelectorAll('.hb-ask-link').forEach((button) => button.addEventListener('click', () => {
    select(1, false);
    $('hb-pane-ask').closest('.hb-card').scrollIntoView({ block: 'center' });
    $('hb-a-question').focus({ preventScroll: true });
  }));

  // "Continue to full request" carries the hero choices into the full form.
  $('hb-continue').addEventListener('click', () => {
    if ($('hb-hero-service').value) $('hb-q-service').value = $('hb-hero-service').value;
    if ($('hb-hero-location').value.trim()) $('hb-q-location').value = $('hb-hero-location').value.trim();
    $('quote').scrollIntoView();
    const next = ['hb-q-service', 'hb-q-location', 'hb-q-name', 'hb-q-email', 'hb-q-message'].map($).find((el) => !el.value.trim());
    (next || $('hb-q-name')).focus({ preventScroll: true });
  });

  // "What brings you here?" picks the service in the hero card and answers in one line.
  const PATHS = {
    build: { service: 'Design and build', text: '<b>We take it from structural design to handover</b>, with a cost estimate and schedule before anything is built.' },
    damage: { service: 'Seismic assessment and retrofit', text: '<b>Start with a damage assessment.</b> Send photos; we check what failed, then design the retrofit if it is needed.' },
    pm: { service: 'Project management', text: '<b>PMP-standard scheduling, procurement and cost control</b>, on site or remotely, reported every week.' },
    boq: { service: 'Cost estimating, BOQ and BOM', text: '<b>Send your drawings.</b> We prepare quantities, BOQ and BOM you can tender and build from, remotely.' },
  };
  const answer = $('hb-answer');
  const heroService = $('hb-hero-service');
  const chips = [...document.querySelectorAll('.hb-chip')];
  const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const on = chip.getAttribute('aria-pressed') !== 'true';
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip && on)));
    if (!on) { answer.hidden = true; answer.textContent = ''; return; }
    const path = PATHS[chip.dataset.path];
    heroService.value = path.service;
    select(0, false);
    answer.innerHTML = `${path.text} <a href="#services">See how &rarr;</a>`;
    answer.hidden = false;
    if (motion && answer.animate) {
      answer.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: 'cubic-bezier(.2,0,0,1)' });
      heroService.animate([{ boxShadow: '0 0 0 3px rgba(226,98,27,.35)' }, { boxShadow: '0 0 0 0 rgba(226,98,27,0)' }], { duration: 900 });
    }
  }));
})();
</script>
```

- [ ] **Step 5: Append quote styles**

Append at the end of `styles.css`:

```css
/* Quote */
.hb .hb-quote{background:var(--hb-ink); color:#CFCDC8; border-radius:24px; padding:48px; display:grid; grid-template-columns:.85fr 1.15fr; gap:44px;}
.hb .hb-quote h2{color:var(--hb-bg); font-size:clamp(28px, 3.2vw, 40px); line-height:1.08; margin:14px 0 14px;}
.hb .hb-quote > div > p{margin:0;}
.hb .hb-tag--dark{background:rgba(244,242,238,.12); color:var(--hb-bg);}
.hb .hb-qsteps{list-style:none; margin:22px 0 0; padding:0; font-size:15px;}
.hb .hb-qsteps li{display:flex; gap:12px; margin-bottom:12px;}
.hb .hb-qsteps b{flex:none; width:26px; height:26px; border-radius:50%; background:rgba(240,136,79,.16); color:var(--hb-orange-light); display:grid; place-items:center; font-size:13px;}
.hb .hb-qform{background:var(--hb-panel); border-radius:18px; padding:26px; color:var(--hb-ink); display:grid; grid-template-columns:1fr 1fr; gap:4px 14px; align-content:start;}
.hb .hb-qform .hb-full{grid-column:1 / -1;}
.hb .hb-qform .hb-label{margin-top:10px;}
.hb .hb-qform textarea{resize:vertical;}
.hb .hb-qform .hb-pill{margin-top:16px;}
@media (max-width:640px){
  .hb .hb-quote{padding:26px 18px; border-radius:18px;}
  .hb .hb-qform{grid-template-columns:1fr; padding:18px;}
}
```

- [ ] **Step 6: Run the tests and confirm they all pass**

Run: `node --test tests/site.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)|^✖"`
Expected: `ℹ fail 0`.

- [ ] **Step 7: Commit**

```bash
git add services.html styles.css tests/site.test.mjs
git commit -q -m "Add the HannBuilders quote form, enquiry tabs, paths and Ask a question" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Motion (reveal, hovers, count-up), with reduced-motion and no-JS fallbacks

**Files:**
- Modify: `styles.css` (append), `services.html` (add one `<script>` before `</body>`)
- Test: `tests/site.test.mjs`

**Interfaces:**
- Consumes: `.hb-reveal`, `--hb-d`, `.hb-t`, `.hb-s`, `.hb-pc`, `.hb-ic`, `b[data-count]` from Tasks 2–3; `html.hb-js` class set in `<head>`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/site.test.mjs`:

```js
test('services reveal only hides content once JavaScript is running, and hovers survive the reveal', () => {
  const css = read('styles.css');
  assert.match(read('services.html'), /<head>[\s\S]*<script>document\.documentElement\.classList\.add\('hb-js'\);<\/script>[\s\S]*<\/head>/);
  assert.match(css, /\.hb-js \.hb \.hb-reveal\{opacity:0;\}/, 'hidden start only with JS');
  // A one-off animation (not a transition) so card hover transforms still apply after the reveal.
  assert.match(css, /\.hb-js \.hb \.hb-reveal\.is-in\{opacity:1; animation:hb-rise \.6s var\(--hb-ease\) var\(--hb-d, 0s\) backwards;\}/);
  assert.match(css, /@keyframes hb-rise\{from\{opacity:0; transform:translateY\(18px\);\}\}/);
  for (const sel of ['.hb .hb-t:hover', '.hb .hb-s:hover', '.hb .hb-pc:hover']) assert.match(css, new RegExp(sel.replace(/\./g, '\\.') + '\\{[^}]*transform:translateY\\(-[34]px\\)'), sel);
  assert.match(css, /\.hb \.hb-t::after\{[^}]*transform:scaleX\(0\)/, 'trust tile underline');
});

test('services motion switches off for reduced motion; counted figures keep their real values', () => {
  const css = read('styles.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{\s*\.hb-js \.hb \.hb-reveal\{opacity:1;\}\s*\.hb \*, \.hb \*::before, \.hb \*::after\{animation:none !important; transition:none !important;\}/);
  const js = servicesScripts();
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /data-count|dataset\.count/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  const html = read('services.html');
  for (const [count, shown] of [['4970', '4,970'], ['182', '182'], ['6', '6'], ['6.3', '6.3']]) {
    assert.match(html, new RegExp(`data-count="${count.replace('.', '\\.')}"[^>]*>${shown.replace('.', '\\.')}`), `${count} shown in HTML`);
  }
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test tests/site.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)|^✖"`
Expected: the two new tests fail.

- [ ] **Step 3: Append motion styles**

```css
/* Motion: reveal on scroll, hover lifts. Off under reduced motion; content visible without JS. */
.hb-js .hb .hb-reveal{opacity:0;}
.hb-js .hb .hb-reveal.is-in{opacity:1; animation:hb-rise .6s var(--hb-ease) var(--hb-d, 0s) backwards;}
@keyframes hb-rise{from{opacity:0; transform:translateY(18px);}}
.hb .hb-t, .hb .hb-s, .hb .hb-pc{transition:transform .25s var(--hb-ease), box-shadow .25s;}
.hb .hb-t::after{content:""; position:absolute; left:0; right:0; bottom:0; height:3px; background:var(--hb-orange); transform:scaleX(0); transform-origin:left; transition:transform .3s var(--hb-ease);}
.hb .hb-t svg{transition:transform .25s cubic-bezier(0.34, 1.56, 0.64, 1), stroke .25s;}
.hb .hb-t:hover{transform:translateY(-3px); box-shadow:0 14px 30px rgba(30,33,36,.10);}
.hb .hb-t:hover::after{transform:scaleX(1);}
.hb .hb-t:hover svg{transform:translateY(-2px) scale(1.12); stroke:var(--hb-orange);}
.hb .hb-s:hover{transform:translateY(-4px); box-shadow:0 16px 34px rgba(30,33,36,.10);}
.hb .hb-s:hover .hb-ic{background:var(--hb-orange);}
.hb .hb-s:hover .hb-ic svg{stroke:var(--hb-ink);}
.hb .hb-pc:hover{transform:translateY(-4px); box-shadow:0 18px 38px rgba(30,33,36,.12);}
.hb .hb-pc-photo img{transition:transform .6s var(--hb-ease);}
.hb .hb-pc:hover .hb-pc-photo img{transform:scale(1.04);}
.hb .hb-more i{transition:transform .2s;}
.hb .hb-pc:hover .hb-more i{transform:translateX(4px);}
.hb .hb-pane:not([hidden]){animation:hb-fade .3s ease;}
@keyframes hb-fade{from{opacity:0; transform:translateY(4px);}}
@media (prefers-reduced-motion: reduce){
  .hb-js .hb .hb-reveal{opacity:1;}
  .hb *, .hb *::before, .hb *::after{animation:none !important; transition:none !important;}
}
```

- [ ] **Step 4: Add the motion script before `</body>`**

```html
<script>
(() => {
  // Reveal sections once as they enter the viewport; count project figures up once.
  const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in');
    reveal.unobserve(entry.target);
  }), { threshold: 0.15 });
  document.querySelectorAll('.hb-reveal').forEach((el) => reveal.observe(el));
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const format = (value, decimals) => decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString('en');
  const counter = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    counter.unobserve(entry.target);
    const el = entry.target;
    const to = parseFloat(el.dataset.count);
    const decimals = Number(el.dataset.dec || 0);
    const suffix = el.dataset.suffix ? el.dataset.suffix.replace('&sup2;', '²') : '';
    const start = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - start) / 1100);
      el.textContent = format(to * (1 - Math.pow(1 - k, 3)), decimals) + suffix;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  document.querySelectorAll('.hb [data-count]').forEach((el) => counter.observe(el));
})();
</script>
```

Note: `data-suffix=" m&sup2;"` is decoded by the HTML parser to ` m²`, so `el.dataset.suffix` already holds `²`; the `.replace` is a harmless safeguard.

- [ ] **Step 5: Run the tests and confirm they all pass**

Run: `node --test tests/site.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)|^✖"`
Expected: `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add services.html styles.css tests/site.test.mjs
git commit -q -m "Add gentle motion to the HannBuilders page with reduced-motion and no-JS fallbacks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Docs, browser verification, push and republish

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

In the first paragraph, change the page list so it reads "... `contact.html` (details + Web3Forms enquiry form), `services.html` (HannBuilders, Hanny's future company: branded services page with a quote form), and one page per Selected work case ..." and change "duplicated in every page (six)" to "duplicated in every page (seven)". Under "## Design system" add the line:

```markdown
- Exception: `services.html` is the HannBuilders brand (charcoal `#1E2124` + safety orange `#E2621B`, calm treatment). Its styles live in the `/* ===== HannBuilders services page ===== */` block of `styles.css`, scoped under `.hb` with `hb-` class names; the burgundy-accent rule does not apply inside `.hb`.
```

and in the Web3Forms paragraph add: "The services page's quote and question forms use the same placeholder key."

- [ ] **Step 2: Full test run**

Run: `node --test tests/site.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)|^✖"`
Expected: `ℹ fail 0`.

- [ ] **Step 3: Browser verification** (preview: `preview_start` with the `portfolio` configuration, then use full-size iframes because the pane's own viewport is 0×0)

Check, recording the results:
- `services.html` at 1280px and 375px: `document.documentElement.scrollWidth` equals the frame width (no horizontal scroll).
- Brand bar sits directly under the site nav while scrolling (its `getBoundingClientRect().top` equals the nav height after `scrollTo(0, 1500)`).
- Clicking each chip sets `#hb-hero-service` to its service and shows `#hb-answer`; clicking it again hides the answer.
- Selecting a service and typing a location, then "Continue to full request": `#hb-q-service` and `#hb-q-location` hold the values and focus is on `#hb-q-name`.
- Submitting the quote form empty shows the five inline errors; with only spaces in Name it still shows the Name error; filled in, the status shows "This form is not connected yet…" and no request goes to api.web3forms.com (`read_network_requests`).
- Tabs switch with ArrowRight/ArrowLeft; an FAQ "Ask a question" button selects the Ask tab.
- Every link in the nav and footer of all seven pages resolves (HTTP 200).
- Hover states (simulated by copying `:hover` rules to a class, as in earlier checks): trust tile lifts 3px with the underline drawn, service and project cards lift 4px.
- Headless screenshots of the full page at 1440px (with `--force-prefers-reduced-motion`) and 375px, reviewed for layout faults.

- [ ] **Step 4: Commit and push**

```bash
git add CLAUDE.md
git commit -q -m "Document the HannBuilders services page in CLAUDE.md" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git pull --rebase -q && git push -q origin main
```

- [ ] **Step 5: Republish the artifact**

Read the live artifact first (`Artifact` action `read`, url `https://claude.ai/artifact/LiKngY8nwyeBYjV6jcT1Nw`) in case another device published. Then publish `index.html` with `files` containing `services.html`, `styles.css`, `resume.html`, `contact.html` and the three `case-*.html` pages (all nav/footer changed). Existing assets are already published and stay.
