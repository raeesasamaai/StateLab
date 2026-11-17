# StateLab

**Build for the unexpected.** A practical UI stress-testing playground for frontend developers and designers, created for **Raeesa Samaai**.

Choose a real component. Change the content, viewport, text size and loading conditions. Inspect its behaviour, edit the underlying JSON, and save a repeatable scenario.

## Included in the MVP

- Three interactive React components: product card, inventory table and people list.
- Seven local content presets: happy path, long content, missing data, zero results, multilingual text, extreme numbers and unbroken strings.
- Success, skeleton-loading, empty and error states with working recovery actions.
- Actual iframe viewport controls from 280–1440 CSS pixels, with optional fit-to-canvas scaling.
- Independent component-preview and workspace light/dark themes.
- Text scaling from 100–200%, LTR/RTL direction, and USD/ZAR/EUR formatting.
- Local response-delay simulation with success/failure outcomes, explicitly labelled separately from network requests.
- Live product data from [DummyJSON](https://dummyjson.com/docs), with request cancellation, response validation and data preservation on failure.
- Editable validated JSON, dataset copying/downloading, portable scenario export/import, local saving, search and removal.
- Content diagnostics and measured frame observations when the frame reports them.
- Optional server-side free-model AI generation, with original local fixtures as fallback.
- Original SVG chair artwork, self-hosted fonts, responsive workspace and reduced-motion support.

**Everything in the core playground works without a paid service or an AI key.** Live AI is not configured in the initial deployment. The generator identifies local versus AI output honestly.

## Run locally

Use Node.js **22 or later** and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Vite serves both the main app and `preview.html`. Local scenarios and the live DummyJSON integration work immediately; AI generation falls back to local fixtures because Vite does not run the Worker API.

For the complete production server locally:

```sh
npm run build
npx wrangler dev
```

Open Wrangler's printed URL. Local Worker development requires no Cloudflare login.

## A quick walkthrough

1. Choose **Product card**, then **Long content** and the mobile viewport.
2. Switch to **Missing data** to inspect image, text, pricing and availability fallbacks.
3. Open **Data editor**. Edit JSON and choose **Apply JSON**. Invalid data stays in the editor and does not replace the working preview.
4. Choose **Data table**, run a delayed failed simulation, and use **Try again** inside the preview to exercise recovery.
5. Select **People list**, try multilingual names, text scaling and RTL layout, then follow a person locally.
6. Save a scenario, reopen it from the library, or export it as portable JSON.

The product button updates a local demo bag; it does not place an order. Table sorting, filtering, selection and clearing work. Following a person changes local demo state. All component interaction state resets when a new configuration is sent to the frame, so each test starts cleanly.

## What the controls mean

**Viewport:** the iframe really renders at the selected CSS width. Fit mode scales its visible presentation to fit the canvas; it does not change the component's internal viewport. Set a custom width and press Enter or leave the field to apply it. This is layout testing, not a full mobile device/browser emulator.

**Text scale:** changes the preview root font size. Built-in components use rem units so text scales with it. This is not identical to every browser's text-only zoom implementation.

**Direction:** sets LTR/RTL layout; it does not translate content. Individual names and product text use automatic text direction.

**Currency:** changes formatting only. Values are not converted. Live DummyJSON prices are supplied as USD values; selecting ZAR/EUR does not perform an exchange-rate calculation.

**Simulation:** uses a local timer, not a network interceptor. A simulated error's retry performs a successful recovery after the configured delay. A live API error is labelled separately; its retry makes another real API request. The session log distinguishes the two paths.

**Saved scenarios:** capture the current data, component, visible state, viewport and appearance. A saved loading state stays loading until changed; saving does not persist an active timer. Unsaved edits and component-local interactions are session-only. Saved configurations and workspace theme persist in localStorage.

## JSON and imports

The editor accepts a dataset with `products` and `people` arrays. Each record needs a unique string ID. Omitted display fields become empty strings or null values to exercise fallback UI. Invalid types, unsafe image schemes, duplicate IDs, excessive lengths and out-of-range numbers are rejected.

```json
{
  "products": [{ "id": "p1", "title": "A product with no other details" }],
  "people": [{ "id": "u1", "name": "A person with missing details" }]
}
```

Use **Download** in the JSON editor for dataset-only exports; paste these back into the editor. Use **Export scenario** and the main **Import** button for the complete portable configuration. Import loads a new working scenario without overwriting saved scenarios; save it if you want a local browser copy.

Limits: 30 products, 50 people, 50 saved scenarios, a 400 KB editor buffer and 500 KB imported scenario file. Browser storage limits may be reached earlier. Failed saves display a warning and are not reported as successfully persisted.

## Observations and their limits

Content observations detect long text, missing core values and record counts. The running iframe reports:

- Horizontal document overflow.
- Horizontally scrollable regions (which may be intentional, particularly tables).
- Visible controls smaller than 24 CSS pixels in either dimension.

Frame messages are checked against the source window, origin, schema and current configuration token. No layout pass result is invented before the frame reports. **These checks are not an accessibility certification, performance audit or full visual regression suite.** They do not assess contrast, screen-reader meaning, complete keyboard access, overlapping elements or every WCAG exception. The preview uses only this project's built-in code; no arbitrary user components or HTML are executed.

## Optional AI setup

1. Confirm your APInex account can use a current `free/*` model without a purchase or subscription.
2. Copy `.env.example` to `.dev.vars` and enter the key for local Worker development.
3. Keep `APINEX_MODEL` set to a free model your account can access; the supplied default is `free/claude-opus-4.6`.
4. Build, run `npx wrangler dev`, then use **Generate an edge case**.

For Cloudflare deployment:

```sh
npx wrangler secret put APINEX_API_KEY
```

For Sites hosting, set the same key through the Site's runtime environment-variable tool/settings. Never commit a key or put it in `VITE_*` variables.

The generator sends only the component type and challenge name, **not your current dataset**. It validates returned data, removes generated image URLs, and constrains emails to example.com. It rejects model IDs without a `free/` prefix and has no paid fallback. A prefix alone does not guarantee a provider's current billing terms; verify access and leave paid billing disabled. Missing credentials, quotas, invalid output or timeouts return labelled local fixtures.

Basic rate caps are per Worker instance, not durable global limits. Add a durable quota and/or Turnstile before broad public promotion if you enable a provider key.

## Build and deployment

```sh
npm test        # logic, adapters, server, component and workspace interactions
npm run build  # TypeScript + multi-entry Vite + standalone Worker
npm run check  # tests + build + production smoke checks
```

GitHub Actions runs a clean `npm ci` and `npm run check`. It does not deploy and needs no cloud secret.

The [Sites review version](https://statelab-raeesa.silkyfoal64.chatgpt.site) is owner-private and requires your ChatGPT sign-in. It is not yet a public recruiter demo. `.openai/hosting.json` records that Site's identity and contains no secrets.

For your own **Cloudflare Workers Free plan** deployment:

```sh
npx wrangler login
npm run deploy:cloudflare
```

Use the free workers.dev address to avoid buying a domain. Check current provider limits before deploying. The production build embeds the main app, preview app, fonts, artwork and licences into `dist/server/index.js`; no asset binding or database is required.

## Structure and extension points

```text
src/App.tsx                   Playground state, controls, simulations and saving
src/components/PreviewFrame    Viewport sizing and validated frame messaging
src/frame/main.tsx            Separate preview application and runtime measurements
src/frame/Components.tsx       Interactive product, table and people components
src/frame/preview.css          Responsive component styles, independent of the app
src/lib/model.ts              Dataset, configuration and snapshot schemas
src/lib/fixtures.ts            Original baseline and stress datasets
src/lib/api.ts                 Fixed DummyJSON adapter and optional generator
src/lib/diagnostics.ts         Content and frame observation presentation
src/lib/storage.ts             Portable imports and local persistence
server/worker.ts              Static delivery and bounded optional AI endpoint
```

Future upgrades: more built-in components, before/after comparisons, scenario collections, automated screenshot regression tests and an isolated custom-component runner. Arbitrary user code requires a separate security design before it can be accepted. Add authentication and project permissions before cloud sharing.

## Privacy and credits

No analytics, account system or cloud synchronisation. Scenarios are not encrypted; use synthetic data. Clearing browser site data removes local saves. Live requests go to DummyJSON, and imported remote image URLs are fetched by the browser. Hosting and API providers may retain ordinary request logs.

Original interface, fixtures and chair illustration: MIT (`LICENSE`). Manrope and Outfit: SIL Open Font Licence. Lucide: ISC. Third-party licence texts are included in `public/licenses/`. Live demo data is supplied by DummyJSON.

Created for [Raeesa Samaai](https://github.com/raeesasamaai) with AI-assisted development. See [docs/CASE_STUDY.md](docs/CASE_STUDY.md) and [docs/VALIDATION.md](docs/VALIDATION.md) for decisions and verification limits.
