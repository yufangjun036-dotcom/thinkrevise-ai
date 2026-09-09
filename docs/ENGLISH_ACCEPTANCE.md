# English Version Acceptance Check

Date: 9 September 2026

## Result

The independent English build passes its local release checks. No paid API request was made.

## Verified

- English home page and both learning entry points render correctly.
- Target-word cards show English collocations and examples without Chinese translations.
- The production build compiles successfully.
- Learning-data checks pass across 15 topic-and-level combinations.
- Revision regression passes 19 pipeline cases plus span, category and ordering cases.
- Accuracy-boundary, duplicate-feedback and independent-review safeguards pass.
- Security, request-budget and prompt-injection boundary checks pass.
- The accuracy dataset contains 43 cases; academic stability contains 17 cases; long-form validation contains 6 cases.
- The independent review pack contains 66 cases and 97 labels.
- The independent English source was pushed to its own private GitHub repository.
- The English site was deployed independently at <https://thinkrevise-ai.vercel.app>.
- The deployed home page was checked directly: both learning entry points rendered in English and no Chinese characters were present in the visible page text.

## Still required before publication

- Configure a separate API key/environment for the English deployment.
- Run the three-case [English live-AI spot-check](ENGLISH_LIVE_SPOT_CHECK.md), covering a multiple-error draft, a correct draft and an unverifiable-evidence draft.
