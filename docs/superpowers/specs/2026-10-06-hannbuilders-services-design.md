# HannBuilders Services page: design

Date: 2026-10-06
Status: approved in brainstorming; awaiting written-spec review
Reference mockup: `.superpowers/brainstorm/1179-1791217821/content/services-full.html` (local only, not committed)

## Goal

Add a **Services** page to the portfolio that showcases **HannBuilders**, Hanny Gravino's future company, as a branded, full-service company page. It must make two audiences comfortable enough to ask questions and request quotes:

- **Owners** (homeowners, schools, developers) who want something built or retrofitted in the Philippines.
- **Project teams** (contractors, architects, firms) who want project management, structural design or estimating, delivered on site or remotely.

Success: within the first screen a visitor understands what HannBuilders does, why to trust it (credentials and real projects), and how to ask a question or request a quote. The page should feel calm and approachable, not loud.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Business | Hybrid: consultancy (PM, structural design, seismic assessment, retrofit design, estimating) plus building and retrofit works |
| Market | Building and retrofit works in the Philippines; PM, design and estimating also remote, worldwide |
| Brand | Own identity with shared roots: direction B (charcoal + safety orange), Archivo + Inter, used calmly |
| Main CTA | Quote-request form on the page (Web3Forms), plus an "Ask a question" path |
| Honesty | Founder-led, open now. Experience credited as "projects led by our founder"; no invented company history, client logos, reviews or prices |
| Structure | Single long landing page |
| Feel | Inspired by primewellnesschiropractic.com.au, imperialshinez.com.au, elitewastesolutions.com.au: rounded panels, pill buttons, real photos, contact details visible, enquiry form in the hero, plain-language process, gentle motion |

## Site integration

- New file `services.html` at the repo root, alongside the other pages.
- Nav order on **every** page becomes: Work · Resume · **Services** · Contact. Footer links get the same addition (Work · Resume · Services · Contact · Back to top). That is seven pages: `index.html`, `resume.html`, `contact.html`, the three `case-*.html` pages and `services.html`.
- On `services.html` the Services link carries `aria-current="page"` in nav and footer.
- `services.html` keeps the portfolio chrome: the `<div id="top">` marker, the shared site nav and the graphite footer. Everything between them belongs to HannBuilders.
- Shared rules still apply: Archivo for headings, Inter for body. Services-page styles live in `styles.css`, scoped under a `.hb` class on `<main>`, so they never affect other pages.
- `services.html` loads Archivo with the width axis (`Archivo:wdth,wght@62..125,500..800`) for the slightly condensed HannBuilders headings (`font-stretch:88%`); other pages keep their current font link.
- CLAUDE.md gets a note: the Services page is the HannBuilders brand. It uses charcoal and safety orange; the portfolio's burgundy rule does not apply inside `.hb`.

## Brand tokens (scoped to `.hb`)

| Token | Value | Use |
|---|---|---|
| `--hb-ink` | `#1E2124` | charcoal: text, dark panels, dark buttons |
| `--hb-ink-2` | `#4A4E53` | secondary text |
| `--hb-muted` | `#6B6F74` | captions, small print |
| `--hb-bg` | `#F4F2EE` | page background (warm concrete cream) |
| `--hb-panel` | `#FFFFFF` | cards |
| `--hb-stone` | `#E7E4DE` | tags, tab track, FAQ "+" |
| `--hb-line` | `#DCD8D0` | borders, dividers |
| `--hb-orange` | `#E2621B` | primary buttons, active chip, accents (never body text on light) |
| `--hb-orange-deep` | `#B44912` | icons, eyebrow text on light |
| `--hb-orange-soft` | `#FBE9DE` | icon chips, ask card |
| `--hb-orange-light` | `#F0884F` | accents on charcoal (headline phrase, icons) |

Checked contrast (all ≥ 4.5:1): charcoal on orange 4.6; light orange on charcoal 6.4; deep orange on cream 4.8 and on white 5.4; ink-2 on white 8.4; muted on cream 4.5; light text `#CFCDC8` on charcoal 10.2.

Shapes: cards 16–20px radius, hero and quote panels 24px, pill buttons and chips fully rounded. Soft shadows only on hover and on the hero enquiry card.

## Page sections (top to bottom)

Copy below is the approved draft; wording may be tuned during the build without changing facts.

0. **Brand bar** (sticky, pinned directly below the already-sticky site nav, so both stay visible while scrolling this page): logo mark + "HANN**BUILDERS**" wordmark; anchor links Services · How we work · Projects · About · FAQ (hidden under 900px); "Request a quote" dark pill.
1. **Hero** (charcoal rounded panel, two columns):
   - Left: tag "Founder-led · Mindanao, Philippines · Remote services worldwide"; H1 "Build, retrofit or plan it *with an engineer* beside you." (phrase in light orange); lead "Design-and-build, seismic retrofit and project management, led by a PMP-certified structural engineer. Ask us anything: there's no obligation."; buttons "Request a quote" (orange) and "See our services" (outline); email `hannygravino.ph@gmail.com` and phone `+63 947 324 5278` as `mailto:`/`tel:` links; **"What brings you here?"** chips; **"Recent work by our founder"** mini cards.
   - Right: photo `assets/cases/norbert-retrofit/building-scaffold.jpg` (max 380px tall, caption "Norbert Building retrofit, Digos City"); enquiry card with tabs **Request a quote** / **Ask a question**.
2. **Trust row**: four white tiles with orange line icons: PMP-certified, NSCP / NBCP, Seismic expertise, Clear costs.
3. **Services** (`#services`), in two labelled groups, three cards each with icon, one-line description and three ticked deliverables:
   - For owners, building and retrofit in the Philippines: Design and build; Seismic assessment and retrofit; Construction management.
   - For project teams, on site or remote (each tagged "Remote"): Project management; Structural design and analysis; Cost estimating, BOQ and BOM.
4. **How we work** (`#process`): photo `assets/cases/norbert-retrofit/board-site-visit.jpg` (sticky beside the steps on desktop) and five steps: Talk it through · Assess and design · Estimate and plan · Build or manage · Hand over.
5. **Projects led by our founder** (`#projects`): two cards linking to `case-cor-jesu-law.html` (photo `architect-perspective.jpg`, 4,970 m², 182 m from an active fault) and `case-norbert-retrofit.html` (photo `building-exterior.jpg`, 6 storeys, 6.3 magnitude), plus the credit line "Projects delivered while working with WMCabardo Engineering & Consulting and ADRA Constructions Corporation."
6. **Why HannBuilders**: three charcoal cards: Built for earthquakes; Costs you can see; One accountable lead (each grounded in the cases).
7. **Meet the founder** (`#about`): `assets/hero-site.jpg` with `assets/headshot.jpg` overlapping; "Hi, I'm Hanny Gravino." with two short paragraphs; issuer logos from `assets/issuers/` (grey, colour on hover); ticks PMP · CAPM · MIEAust · MIET · M.ASCE; "View full resume" → `resume.html`.
8. **FAQ** (`#faq`): six `<details>` questions (where we work; remote services; what to send; how quotes work; working with your architect or contractor; earthquake damage) beside a "Don't see yours? Ask a question" card.
9. **Request a quote** (`#quote`): charcoal panel with "Tell us about your project", three "what happens next" steps, contact details, and the full form.

Then the standard graphite portfolio footer.

## Forms

Both use Web3Forms with the same access-key placeholder as `contact.html` (`YOUR_WEB3FORMS_ACCESS_KEY`), the same placeholder check (shows "not connected yet" and points to the email), a hidden `botcheck` honeypot, visible labels, inline errors next to fields, and a `role="status"` live region for success or failure.

- **Full quote form** (`#quote`): Service (select, includes "Not sure yet") *required*; Project type (Residential / Commercial / School or institutional / Other); Location *required*; Size or budget (optional); Timeline (optional select); Name *required*; Email *required*; Phone (optional); Tell us more *required*. Email subject: "HannBuilders quote: {service}".
- **Hero card, Request a quote tab**: Service + Location, then "Continue to full request" copies both values into the full form and scrolls to `#quote`, focusing the next empty required field. No submission from the hero.
- **Hero card, Ask a question tab**: Question *required* and Email or phone *required*; submits directly via Web3Forms with subject "HannBuilders question". The "Ask a question" buttons in the FAQ open this tab and scroll to the hero card.
- **"What brings you here?" chips** (`aria-pressed` toggles): selecting one sets the hero card's Service, briefly highlights that field, and shows a one-line answer with a "See how →" link to `#services`. Clicking the active chip clears it.

| Chip | Service set | Answer |
|---|---|---|
| Planning a new building | Design and build | We take it from structural design to handover, with a cost estimate and schedule before anything is built. |
| My building was damaged | Seismic assessment and retrofit | Start with a damage assessment. Send photos; we check what failed, then design the retrofit if it is needed. |
| I need a project manager | Project management | PMP-standard scheduling, procurement and cost control, on site or remotely, reported every week. |
| I need estimates or a BOQ | Cost estimating, BOQ and BOM | Send your drawings. We prepare quantities, BOQ and BOM you can tender and build from, remotely. |

## Motion (gentle; all off under `prefers-reduced-motion: reduce`)

- Sections and cards fade up 18px once when they enter the viewport, lightly staggered. Implemented as a one-off keyframe animation (not a transition) so hover transforms still apply afterwards; content is visible without JavaScript.
- Cards (trust tiles, services, projects, recent-work minis) lift 2–4px with a soft shadow on hover. Trust tiles also nudge their icon up, scale it 1.12 and draw an orange line along the bottom edge. Service icons fill orange.
- Pill buttons: the arrow circle rotates to ↗ and nudges on hover.
- Enquiry tabs: a sliding white indicator; panes fade in.
- Project figures count up once (about 1.1s, ease-out) when visible; the final values are in the HTML, so no-JS and reduced-motion visitors see them directly.
- FAQ "+" rotates to "×" when open.
- Project photos zoom to 1.04 on hover; "Read the full case →" arrows slide.

## Accessibility and responsiveness

- One `<h1>`; sections use `<h2>`, cards `<h3>`. Decorative images and icons have empty `alt`/`aria-hidden`; meaningful photos get short alt text.
- Tabs use `role="tablist"`/`tab`/`tabpanel` with arrow-key support (same pattern as the resume tabs). Chips are buttons with `aria-pressed`. Visible focus rings on every control.
- Touch targets at least 44px tall.
- Breakpoints: under 900px the hero, process, founder, FAQ and quote layouts stack to one column, the brand-bar links hide (the quote button stays), and the service, why and trust grids go to two columns; under 640px everything is one column. No horizontal scroll at 375px.
- Images use `loading="lazy"` below the fold and explicit width/height.

## Testing

Structural tests in `tests/site.test.mjs`, written first:

- `services.html` exists, uses `styles.css`, has the `#top` marker, the graphite footer, and `aria-current="page"` on Services in nav and footer.
- Every page's nav and footer list Work · Resume · Services · Contact (update `assertNav` and the footer test).
- Section anchors present in order: services, process, projects, about, faq, quote; one `<h1>`.
- Hero contains the email and phone links, the four path chips with `aria-pressed`, and the two recent-work links to the case pages.
- Service cards: three per group, the "Remote" tag only on the project-team group.
- Forms: Web3Forms action, placeholder key, honeypot, required fields as listed, status regions; the placeholder check runs before `fetch`.
- Brand tokens exist in `styles.css`, scoped under `.hb`; the contrast pairs above meet 4.5:1.
- Reduced-motion block disables the reveal, count-up and hover transforms.

Browser verification: desktop and 375px renders, chip and tab behaviour, form validation states, and a hover-state check (simulated, since the preview pane can't hover).

## Out of scope

- The standalone HannBuilders website and domain.
- A final logo; the square-frame mark is a placeholder.
- Prices, testimonials, client logos and a company history.
- Case page changes beyond the nav and footer link.

## Open items for Hanny to confirm (do not block the build)

- "Mindanao, Philippines" as the service area.
- The founder paragraphs, written in her voice.
- A real Web3Forms access key (shared with the contact page).
