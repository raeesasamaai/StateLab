# StateLab — designing for the data that actually shows up

## Problem and audience

Frontend developers and designers often review a component with a short title,
a flattering image and a successful response. The same interface has to survive
missing values, long strings, different scripts, empty lists and failed requests.

StateLab makes those conditions quick to reproduce and save. The MVP deliberately
uses three built-in components so it can provide real interaction without running
arbitrary user code.

## Experience and visual direction

A quiet indigo workspace surrounds a neutral, gridded canvas. The preview has its
own fictional design brand and independently controlled theme, helping distinguish
the tool from the component being tested. The right panel groups content, states,
network and appearance into a repeatable inspection workflow.

The product card has an original SVG illustration and real local bag interaction.
The inventory table supports sorting, search and selection. The people list
supports local following and fallback identities. None of these actions submits
an order, changes a real inventory or contacts a person.

## Engineering decisions

- A separate Vite entry point renders the component inside an actual iframe.
  CSS width testing is separated from display scaling.
- The preview stylesheet is independent of the application's stylesheet. Relative
  units allow root text scaling; logical layout properties support RTL inspection.
- Parent/frame communication checks origin, source window, message schema and a
  configuration token. Data is rendered as React text, not executable markup.
- Local fixtures make the core app useful without network access after loading.
- Real API fetching and local delay simulations use separate log labels. Live
  errors preserve existing data and have real network retries.
- Invalid JSON remains editable without replacing the applied dataset. Omitted
  display values are normalised into missing-data cases.
- Saved scenarios capture configuration, not active timers or component interaction
  history. JSON snapshots are portable; localStorage provides browser persistence.
- AI generation receives only a generic challenge, never the user's dataset.
  Original fixtures remain available when provider access is absent or fails.
- Measurements are presented as observations with explicit limits, not compliance
  certification or invented performance scores.

## Trade-offs and next steps

The MVP is a personal playground, not Storybook replacement infrastructure or a
hosted execution service. Shared projects need accounts and access controls.
Custom component execution needs a separate isolation and security model. Visual
regression workflows need a real browser runner and stable baselines.

The next research step is to observe developers recreating an actual UI defect,
then assess whether they can save and explain the scenario. No user-study results,
adoption numbers, time savings or recruiter outcomes have been invented.

This project was built with AI assistance. Review the iframe protocol, schema
normalisation, cancellation handling and test limits before presenting it in an
interview.
