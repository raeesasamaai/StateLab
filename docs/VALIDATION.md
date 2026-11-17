# Validation · 17 November 2026

## Passed during implementation

- 39 automated tests across logic, adapters, the optional generator, component
  interactions and workspace interactions.
- TypeScript compilation and the multi-entry production build.
- Built-Worker smoke checks for both entry points, referenced assets, security
  headers, health, local generation and missing assets.
- A live DummyJSON request returning eight products.
- Production dependency audit: zero reported vulnerabilities at validation time.

The project includes automated tests for fixture validity, numeric edge cases,
unsafe image rejection, duplicate IDs, configuration bounds, optional-field
normalisation, frame-report interpretation, scenario imports, storage failures,
API adapters, cancellation, generator safeguards, and component interactions.

React Testing Library tests exercise the real component implementations in a
simulated DOM: bag actions, image fallback, missing data, sorting, filtering,
selection, following and recovery callbacks. Workspace tests exercise preset
selection, invalid JSON handling, iframe width configuration, saving and restoring
scenarios, timed simulations, storage-error messages and theme persistence.

The production smoke test executes the built Worker and checks the main page,
preview page, their referenced assets, security headers, illustration, health,
local generator and missing assets. A live DummyJSON request returned 8 products
during implementation. The production dependency audit reported zero known
vulnerabilities at the time of validation.

## Verification limits

- The managed preview relay failed to open browser port 4173. No alternate
  preview server or browser-control path was used to bypass this infrastructure.
- Simulated-DOM tests do not execute the separate iframe bundle or compute real
  browser layout. They do not establish actual overflow geometry, frame-message
  delivery, image sizing, RTL appearance, mobile layout, native focus management,
  file-download behaviour or clipboard permissions in a browser.
- Native dialog behaviour and ResizeObserver are stubbed for workspace tests.
- Live AI output is unverified because no provider key was supplied. Provider
  success and failure are tested with controlled responses; local fixtures are
  the default operational path.

Before public promotion, verify both themes and all three components in a native
browser. Check iframe reports at 390/768/1280px, text scale 200%, RTL, a live API
request and failure, a saved loading state, JSON export/import, keyboard use, and
image failure recovery. The UI's geometry checks remain intentionally limited
even after that review.
