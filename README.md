<p align="center">
  <img src="docs/path-banner.png" alt="PATH — Public Access Terminal &amp; Help" width="620">
</p>

# PATH — Public Access Terminal & Help

A public-facing, touchscreen kiosk web application for the Superior Court of California, County of Monterey. Visitors use it for self-service access to court services, department hearing calendars, and an interactive building map with turn-by-turn wayfinding.

Built with **Angular 21** (standalone components, signals, zoneless) + **Bootstrap 5** + **Angular Material** (M3) + **SweetAlert2**.

## Features

- **Fully bilingual (English / Spanish)** — one-tap EN/ES toggle in the navbar; every page, including SVG map labels and spoken audio, re-renders live. *(Spanish strings are drafts pending official court review.)*
- **Interactive wayfinding** — an exploded isometric view of all four floors plus a per-floor detail view, with Dijkstra routing over a node graph, cross-floor routes via elevator or stairs, and turn-by-turn directions.
- **Court calendars** — per-department hearing schedules (currently seeded sample data; swap `generateRows()` in `pages/calendar/calendar.ts` for a real API call).
- **Kiosk-safe services** — transactional services (payments, transcript orders) never open on the kiosk; they show an info page with an offline-generated QR code and a plain-text URL so visitors finish on their own phone.
- **Accessibility modes** — one-tap large text, high contrast, and audio assistance (Web Speech API self-voicing with spoken directions). Modes are per-visitor, never persisted, and reset on idle.
- **Idle reset** — after ~2 minutes of inactivity (with a "still there?" countdown), the kiosk returns home and clears accessibility modes for the next visitor.

## Development

```bash
npm install
npm start        # ng serve on port 4300, binds 0.0.0.0
```

Routes: `/` · `/services` · `/service/:id` · `/calendars` · `/calendar/:dept` · `/map`

## Production build & deployment

```bash
npx ng build     # output in dist/path-kiosk/browser
```

Deploy the build output to any static web server. Because this is an SPA with client-side routing, the server needs a fallback rewrite rule sending all paths to `index.html` (on IIS: URL Rewrite module; on nginx: `try_files $uri /index.html;`).

For kiosk hardware, pair with a locked-down browser (e.g. Chromium `--kiosk` mode or a dedicated kiosk browser with a URL allowlist).

## Project layout

```
src/app/
├── core/               # I18nService, IdleService, AccessibilityService
├── shared/             # navbar (lang + accessibility toolbars), footer
└── pages/
    ├── home/           # 4 kiosk tiles
    ├── services/       # service cards (external, QR info page, or coming soon)
    ├── service-info/   # QR + URL page for use-your-phone services
    ├── calendars/      # department picker
    ├── calendar/       # per-department schedule (seeded sample data)
    └── map/            # wayfinding: wayfinding.ts (graph + Dijkstra), map.ts (isometric SVG)
```
