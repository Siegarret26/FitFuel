# FitFuel

A free, all-in-one fitness and health platform — workout tracking, meal planning,
GPS activity tracking, nutrition monitoring, a planning calendar and an AI coach —
running entirely in the browser.

**Live:** https://fitfuel-ihuvidea.vercel.app

---

## Project structure

```
fitfuel/
├── index.html              Page shell: meta, Firebase init, stylesheet and script links
├── manifest.json           PWA manifest (installable to a home screen)
├── service-worker.js       Offline caching of the app shell
├── css/                    Stylesheets, loaded in order
│   ├── 01-base.css           Theme variables, reset, typography
│   ├── 02-components.css     Buttons, cards, toggles, form controls
│   ├── 03-navigation.css     Desktop nav, mobile bar, responsive tiers
│   ├── 04-auth.css           Login, sign-up, onboarding
│   ├── 05-activity.css       GPS tracking, maps, analytics
│   ├── 06-home.css           Dashboard hero and stats
│   ├── 07-workouts.css       Workout cards and active sessions
│   ├── 08-meals.css          Meal cards and recipe modals
│   ├── 09-settings.css       Settings and appearance controls
│   ├── 10-modals.css         Modal system, progress photos
│   ├── 11-ai-coach.css       AI chat, sidebar, content cards
│   ├── 12-landing.css        Public landing page
│   └── 13-features.css       Completion screen, nutrition, planner, brand mark
├── js/                     Application source, loaded in order
│   ├── 01-config.js          Themes, Firestore helpers, storage, onboarding config
│   ├── 02-calculations.js    Nutrition targets, session and planner maths
│   ├── 03-data.js            Exercise library, 45 workouts, 60 meals
│   ├── 04-ui-shared.js       Logo, shared controls, navigation
│   ├── 05-landing-auth.js    Landing page, authentication, onboarding
│   ├── 06-cards-modals.js    Cards, detail modals, exercise rows
│   ├── 07-activity.js        GPS tracking and analytics UI
│   ├── 08-page-home.js       Dashboard
│   ├── 09-page-workouts.js   Workout library and guided sessions
│   ├── 10-page-meals.js      Meal library
│   ├── 11-page-nutrition.js  Nutrition and hydration tracker
│   ├── 12-page-progress.js   Planner calendar and progress
│   ├── 13-page-profile.js    Profile, goals, BMI
│   ├── 14-page-coach.js      AI Coach
│   ├── 15-page-settings.js   Themes, accessibility, AI settings
│   └── 16-app.js             App root, routing, state
├── icons/                  Favicon and PWA icons
└── worker/                 Cloudflare Worker that proxies the AI API
```

## How it runs

There is **no build step**. JSX is compiled in the browser by Babel Standalone,
and React, Leaflet and Chart.js load from a CDN. Files share a single scope and
are loaded in numbered order, so `16-app.js` can use anything defined earlier.

This keeps deployment to "upload the folder" — no Node, npm or bundler required.

### Running locally

Because the browser blocks loading local scripts over `file://`, opening
`index.html` by double-clicking will **not** work. Serve it instead:

```bash
python3 -m http.server 8000      # then open http://localhost:8000
```

### Deploying

Upload the whole folder to any static host (Vercel, GitHub Pages, Netlify).
No configuration needed.

## Services

| Service | Purpose |
|---|---|
| **Vercel** | Static hosting |
| **Firebase Auth** | Accounts and login |
| **Firestore** | User data, synced across devices |
| **Cloudflare Worker** | Holds the Gemini API key server-side |
| **Google Gemini** | AI coach and nutrition assistant |

### Setup notes

When the deployed domain changes, two things must be updated or the app breaks:

1. **Firebase** → Authentication → Settings → Authorized domains — add the domain,
   or login fails with `auth/unauthorized-domain`.
2. **Cloudflare Worker** → `ALLOWED_ORIGINS` in `worker/fitfuel-proxy-worker.js` —
   add the domain and redeploy, or the AI Coach returns 403.

The Gemini API key is stored as a Cloudflare **secret** named `GEMINI_API_KEY`.
It is never committed to this repository, because keys found in public code are
detected and revoked automatically.

## Known limitations

- **Background GPS is not possible.** Browsers stop reporting location once the
  screen locks. FitFuel requests a wake lock to keep the screen on, and warns the
  user, but cannot record while the phone is locked.
- **Elevation is not factored into calorie estimates**, so hilly routes are
  slightly underestimated.
- **Progress photos stay on the device** and do not sync between devices.
