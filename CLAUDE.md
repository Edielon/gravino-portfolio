# Gravino portfolio

Multi-page static portfolio for Hanny Creselle B. Gravino, PMP-certified project manager and structural engineer. Pages: `index.html` (hero, work, certifications), `resume.html` (career, education, expertise), `contact.html` (details + Web3Forms enquiry form). Shared styles live in `styles.css`; the nav/footer block is duplicated in each page, so change all three together. Structural tests: `node --test tests/site.test.mjs`. Local preview: `node .claude/serve.js` → http://localhost:4173.

The site is also published as the Claude artifact https://claude.ai/artifact/LiKngY8nwyeBYjV6jcT1Nw (index.html as the page, the other files as supporting files). After editing, republish to that same URL.

The contact form needs a real Web3Forms access key in place of `YOUR_WEB3FORMS_ACCESS_KEY` in `contact.html`.

## Workflow for changes

- Use the **superpowers** skills for process: start with `superpowers:brainstorming` for any design or content change, and finish with `superpowers:verification-before-completion` before calling work done.
- Use **ui-ux-pro-max** (`ui-ux-pro-max:ui-ux-pro-max`) for all UI/UX decisions: layout, typography, colour, spacing, accessibility and responsive behaviour.

## Design system

- Fonts: Space Grotesk for headings (`--font-display`), Inter for everything else (`--font-body`). No other typefaces.
- Headings are near-black graphite (`--heading`), sentence case. Burgundy (`--accent`) is for small accents only (rules, labels, primary button, corner block), never for headline text.
- Audience is potential clients: copy must be professional and specific, grounded in real project facts.
- Positioning: Hanny's main specialty is project management (PMP-certified), backed by structural engineering. Lead with PM, then structural design and seismic retrofit.
- Hero headline is a plain identity statement (name, role, specialty, where), one line, no subtext under it.
