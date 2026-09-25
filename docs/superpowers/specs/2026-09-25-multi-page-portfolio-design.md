# Multi-page portfolio: design

Date: 2026-09-25
Status: approved in chat, awaiting spec review

## Goal

Split the single-page portfolio into three pages so the site feels sleeker and more organized for potential clients. The home page stays focused on who Hanny is, her work and her credentials. Résumé detail and contact move to their own pages. Also, give the hero some character with subtle building line art in the empty side space.

## Constraints

- Static HTML and CSS only: no build step, no backend. It must work on GitHub Pages, Vercel, Netlify or Cloudflare Pages, and when the files are opened locally.
- Keep the existing design system from `CLAUDE.md`: Space Grotesk headings, Inter body text, graphite headings, burgundy accents only.
- The hero headline stays as it is, with no text under it.

## Files

| File | Contents |
|---|---|
| `styles.css` | All shared CSS, moved out of `index.html`. Every page links it. |
| `index.html` | Nav, hero with line art, hero photo, stats band, Selected work, Certifications, footer |
| `resume.html` | Nav, Career timeline, Education (with headshot placeholder), Expertise, footer |
| `contact.html` | Nav, contact band with details and form, footer |

Pages link to each other with relative `.html` paths (`index.html`, `resume.html`, `contact.html`, `index.html#work`).

## Navigation

- The "H. Gravino" wordmark links to `index.html`.
- The links are **Work** (`index.html#work`), **Resume** and **Contact**. Profile, Expertise and Certifications are removed.
- The current page's link gets `aria-current="page"` and a visible active style (burgundy underline). Work is not marked active on the home page.
- Same markup on all three pages. The footer's "Back to top" link stays.

## Home page

- Remove the Career/Education block and the Expertise and Contact sections.
- The hero buttons stay: **View Work** → `#work`, **Discuss a Project** → `contact.html`.
- Certifications is unchanged: the PMP card plus the PRC and Engineers Australia placeholders.

## Resume page

- A page title, then Career (the existing timeline), Education (the existing placeholder and headshot placeholder), then Expertise (the existing legend rows).
- Reuse the existing `.career`, `.timeline` and `.legend` styles. No new content is invented.

## Contact page

- The existing dark `.band` contact section, in a two-column grid:
  - **Left:** the "Discuss a project" heading, the existing note, then the Email, Phone and LinkedIn rows (Location removed). Values stay as placeholders until Hanny supplies them.
  - **Right:** the form.
- Form fields, each with a visible `<label>`:
  - Name (required)
  - Email (required, `type=email`)
  - Company (optional)
  - Project type (`<select>`: Project management, Structural design, Seismic retrofit, Other)
  - Message (required, `<textarea>`)
- Submission uses Web3Forms: `POST https://api.web3forms.com/submit` with a hidden `access_key`. The key is a clearly marked placeholder until the user provides one.
- Behaviour, with a small inline script:
  - Submit with `fetch`, and disable the button while sending.
  - On success, show a message in place and reset the form.
  - On failure, show an error message with the email address as a fallback.
  - Required-field errors appear next to each field (`aria-describedby`, `aria-invalid`).
  - Status messages use `role="status"` / `aria-live`.
  - If the key is still the placeholder, show a friendly "form not connected yet" message instead of sending.
  - Without JavaScript, the form still posts normally to Web3Forms.
- Inputs sit on the dark band with light text, visible borders and focus rings. Touch targets are at least 44px high.
- Below 760px the columns stack, form last.

## Hero line art

- Two inline SVGs, `aria-hidden="true"`, absolutely positioned inside the hero and placed in the side gutters beside the centred headline:
  - **Left:** a low-rise building elevation with a tower crane.
  - **Right:** a mid-rise structural frame with a Vierendeel-style truss band.
- Hairline strokes (1 to 1.25px, `vector-effect: non-scaling-stroke`) in `--rule-strong` at about 0.35 to 0.5 opacity. No fills and no motion.
- Anchored to the bottom of the hero so the drawings "stand" on the hero photo edge. They never extend under the headline's text box: the headline column keeps its max width, and the art is sized to the remaining gutter.
- Hidden below 1320px viewport width, where the gutters become too narrow to hold the drawings. The headline measure is 980px, the narrowest that keeps it on 3 lines at 56px.

## Out of scope

- Real contact details, a real Web3Forms key, photos, a CV download: added later when Hanny supplies them.
- Deployment to a host. The claude.ai artifact is republished with all pages. Whether cross-page links work inside the artifact is checked at publish time and reported.

## Verification

- Serve locally. Check every nav link and button on all three pages, and that the active link state is correct.
- At 1440, 1280, 1100, 768 and 375px: no horizontal scroll, line art never overlaps the headline, and the art is hidden below the breakpoint.
- Contact form:
  - Required-field errors appear.
  - With the placeholder key it shows the "not connected" message.
  - Labels and focus are keyboard-reachable.
- Update `CLAUDE.md` to describe the multi-page structure.
