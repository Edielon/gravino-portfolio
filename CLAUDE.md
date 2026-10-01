# Gravino portfolio

Multi-page static portfolio for Hanny Creselle B. Gravino, PMP-certified project manager and structural engineer. Pages: `index.html` (hero, work, certifications), `resume.html` (career, education, expertise), `contact.html` (details + Web3Forms enquiry form), and one page per Selected work case: `case-cor-jesu-law.html`, `case-norbert-retrofit.html`, `case-project-derisk.html` (full Problem/Approach/Result, figures, tools, next-case link; the home page shows only the short version and a "Read the Full Case" link). The case pages' copy is placeholder text taken from the old expanded cases, to be replaced with fuller write-ups. Shared styles live in `styles.css`; the nav/footer block is duplicated in every page (six), so change them together. Case pages mark Work with `aria-current="true"`; the contact page uses the light footer (`site-foot--light`), the others the graphite one. Structural tests: `node --test tests/site.test.mjs`. Local preview: `node .claude/serve.js` → http://localhost:4173.

The site is also published as the Claude artifact https://claude.ai/artifact/LiKngY8nwyeBYjV6jcT1Nw (index.html as the page, the other files as supporting files). After editing, republish to that same URL.

The CV download on `resume.html` serves `assets/Hanny-Gravino-CV.pdf` (currently a placeholder). To update it, replace that file and update the "PDF · N KB" size label next to the button.

Certificate images for the home page pop-up live in `assets/certificates/` as compressed JPGs. Certification numbers, member IDs, QR codes and citizenship are pixelated before publishing; never add an unredacted scan. The PRC licence number is intentionally not shown. Issuer symbols for the certification tiles (PMI, Engineers Australia, IET, ASCE) live in `assets/issuers/`, cut out from the certificates themselves.

The contact form needs a real Web3Forms access key in place of `YOUR_WEB3FORMS_ACCESS_KEY` in `contact.html`.

## Workflow for changes

- Use the **superpowers** skills for process: start with `superpowers:brainstorming` for any design or content change, and finish with `superpowers:verification-before-completion` before calling work done.
- Use **ui-ux-pro-max** (`ui-ux-pro-max:ui-ux-pro-max`) for all UI/UX decisions: layout, typography, colour, spacing, accessibility and responsive behaviour.

## Design system

- Fonts: Archivo for headings (`--font-display`), Inter for everything else (`--font-body`). No other typefaces.
- Headings are near-black graphite (`--heading`), sentence case. Burgundy (`--accent`) is for small accents only (rules, labels, primary button, corner block), never for headline text.
- Audience is potential clients: copy must be professional and specific, grounded in real project facts.
- Positioning: Hanny's main specialty is project management (PMP-certified), backed by structural engineering. Lead with PM, then structural design and seismic retrofit.
- Hero headline is a plain identity statement (name, role, specialty, where), one line, no subtext under it.
