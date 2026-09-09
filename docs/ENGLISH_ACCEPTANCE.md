# English Version Acceptance Check

Date: 9 September 2026

## Result

The independent English build passes its local release checks and the three-case live-AI spot-check on the production site.

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
- A separate production API key and English-project environment were configured without committing the key to the repository.
- Multiple-error case: 13 of 13 underlying language corrections were communicated across 5 grouped feedback cards, with 0 academic false alarms.
- Correct-control case: 0 language checks and 0 academic suggestions, with no false alarm.
- Academic-risk case: 0 language checks and 2 academic-evidence suggestions, correctly identifying the unverifiable source and the unsupported universal policy conclusion.
- All visible headings in the final live results were displayed in English.

## Scope

This is a focused release spot-check, not a guarantee that every future draft will be classified perfectly. Keep the [English live-AI spot-check](ENGLISH_LIVE_SPOT_CHECK.md) as the minimum regression set for later changes.
