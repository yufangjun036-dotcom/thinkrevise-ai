# ThinkRevise AI (English)

ThinkRevise AI is an English-interface academic writing and revision coach for university learners. It helps learners identify language problems, evaluate academic claims and revise their own work without surrendering ownership of the writing process.

This repository is the independent English edition. It has its own Git history, environment settings and production deployment. It does not share a repository, deployment project, learner data or automatic synchronization with the Chinese edition.

## What is different in this edition

- All learner-facing navigation, guidance, feedback and privacy information are in English.
- Topic-writing target-word cards show an English word, an English collocation and an English example only; they do not show Chinese translations.
- The proven writing journeys, safeguards and feedback logic are preserved from the validated Chinese edition.

## Learning journeys

### Guided topic writing

Learners select or describe a topic, choose a level and receive level-appropriate target words. They write an 80–150 word response, complete a self-check, review locatable feedback, revise and reflect on what changed.

### Academic revision studio

Learners choose one of three support levels:

1. **Diagnose My Draft** — identifies and explains problems without supplying replacement sentences before revision.
2. **Local AI Support** — adds optional phrase- or sentence-level examples while leaving the full revision to the learner.
3. **Rewrite for Me** — presents the original beside a complete academic rewrite and clearly labels the lower level of learner participation.

The shared learning loop is:

`Set a goal → First draft → Self-check → AI diagnosis → Learner revision → Version comparison → Reflection → AI contribution record`

## Reliability and privacy

- Original drafts are not overwritten automatically.
- Feedback distinguishes language checks from academic and expression advice.
- Second-draft review separates resolved, remaining, changed and newly discovered issues.
- Prompts prohibit invented facts, data, authors, sources and citations.
- Live requests use a server-only key, request `store: false` and apply size, rate, daily and concurrency limits.
- API responses use `Cache-Control: no-store`.
- Demo mode remains available when no API key is configured or the live service is unavailable.
- Draft recovery uses same-tab `sessionStorage`; the project does not maintain an essay database.
- The interface asks learners to remove names, student numbers and other personal information.

See the public [Privacy and AI Use Notice](app/privacy/page.tsx) for the learner-facing explanation.

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- OpenAI Responses API with structured output
- Deterministic classroom-demo fallback

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The application runs in labelled demo mode when `OPENAI_API_KEY` is empty.

For live feedback, configure an API key only in this English project's local `.env.local` file or in its own deployment provider environment. Never commit the file or expose a key in browser code.

## Verification

```bash
npm run verify
```

This offline verification covers the production build, English interface copy, learning data, revision behaviour, feedback boundaries, duplicate handling, request budgets, security controls and prompt-injection boundaries. It does not make paid API requests.

Live-AI checking is deliberately separate from the offline suite. The production release completed the three-case [English live spot-check](docs/ENGLISH_LIVE_SPOT_CHECK.md); the recorded results are available in the [English acceptance check](docs/ENGLISH_ACCEPTANCE.md).

Public English site: [https://thinkrevise-ai.vercel.app](https://thinkrevise-ai.vercel.app)

## Current status

- Independent English interface: complete
- Offline verification: passed on 9 September 2026
- English-only target-word presentation: verified
- Separate local Git history: complete
- Separate public GitHub repository: complete
- Separate production API configuration: complete; the key remains in the deployment environment and is not committed to Git
- Separate public Vercel deployment: complete
- Live-AI three-case spot-check: passed on 9 September 2026

For the detailed local acceptance record, see [English Version Acceptance Check](docs/ENGLISH_ACCEPTANCE.md).

## License

The original source code and project documentation are available under the [MIT License](LICENSE). The license does not grant access to the project owner's OpenAI account, API key, credits or other credentials. Third-party packages and services remain subject to their own licenses and terms.
