# Chinese/English parity checklist

The validated Chinese version is the source of truth. The English version must change user-visible language only; it must not become a separate product with different behaviour.

## Allowed differences

- User-interface copy and placeholders
- Page title, description, and document language metadata
- AI explanation language and translated demo-feedback copy
- English image alternative text and captions

## Required invariants

- Same routes, component hierarchy, styles, spacing, and responsive breakpoints
- Same two entrances and five-stage learning loop
- Same three help-mode identifiers (`coach`, `model`, and `rewrite`) and disclosure rules
- Same topic identifiers, vocabulary words, levels, and draw counts
- Same input limits, original-draft protection, feedback decisions, and reflection gates
- Same API schema, model setting, `store: false`, and fallback behaviour
- Same optional image path, dimensions, and source record
- Same WebMCP tool name, input schema, and visible state changes

## Verification before release

1. [x] Run the complete build, learning-data, request-boundary and feedback-safeguard tests for the English release.
2. [x] Preserve the Chinese source project as a separate repository and deployment; no automatic cross-project synchronisation is enabled.
3. [x] Complete manual English practice and revision journeys on the deployed site.
4. [x] Confirm the responsive and accessibility safeguards remain present in the inherited layout and automated checks.
5. [x] Test the English public link from the in-app browser without relying on the Vercel account session.

The Chinese and English projects now evolve independently. If a shared behavioural fix is needed later, it must be reviewed and applied deliberately in each repository rather than copied automatically.
