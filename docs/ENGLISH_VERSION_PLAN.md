# ThinkRevise AI English Version

## Project boundary

- This is an independent English project.
- It has its own local Git history and will use a separate remote repository, deployment project, environment variables and analytics.
- The Chinese project is not edited or automatically synchronised from this project.
- Source baseline copied from the stable Chinese project: `a429520`.

## Product parity

The English version keeps the same learning flow and feedback safeguards as the Chinese version:

1. Theme writing practice and academic English revision remain separate entry points.
2. Learners write and self-assess before receiving feedback.
3. Language accuracy is checked before academic argument and expression.
4. Feedback must be locatable, explainable and reviewable by the learner.
5. The second draft is independently rechecked before the final version is generated.
6. A correct draft may receive zero findings; the system must not invent issues to reach a quota.

## English-specific presentation

- All learner-facing navigation, guidance, errors, privacy information and feedback labels are in English.
- Target-word cards show the English word, an English collocation and an English example sentence.
- Target-word cards do not show Chinese translations.

## Release checklist

- [x] Independent local folder and Git history
- [x] English metadata, home page, learning flow and privacy page
- [x] English target-word display with Chinese translations removed
- [x] English custom-topic and demo-draft responses
- [x] Local dependency installation and production build
- [x] Browser walkthrough of both learning paths
- [x] Offline feedback and safeguard regression evaluation
- [x] Live English AI feedback spot-check with the separate production API configuration
- [x] Separate private remote repository and public deployment

## Release status

The independent English production site is live at <https://thinkrevise-ai.vercel.app>. On 9 September 2026, the deployed application passed a focused live-AI check covering a multiple-error draft, a correct control and an unverifiable-evidence draft. See [ENGLISH_ACCEPTANCE.md](ENGLISH_ACCEPTANCE.md) for the recorded results and limitations.
