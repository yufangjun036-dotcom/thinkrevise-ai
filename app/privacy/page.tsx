import Link from "next/link";

export const metadata = {
  title: "Privacy and AI Use | ThinkRevise AI",
};

export default function PrivacyPage() {
  return <main className="privacy-page">
    <nav><Link href="/">← Back to ThinkRevise AI</Link></nav>
    <article>
      <p className="overline">Public testing notice</p>
      <h1>Privacy and AI Use</h1>
      <p className="privacy-lead">ThinkRevise AI supports academic English writing practice. Before submitting text, remove names, student numbers, contact details, unpublished research data and any other personal or sensitive information.</p>

      <section>
        <h2>What is sent to AI</h2>
        <p>When you use live analysis, custom-topic interpretation or demo-draft generation, the current draft, topic description, target words, self-check and necessary previous feedback are sent to the server and then to the OpenAI API. The API key remains on the server and is never sent to your browser.</p>
      </section>

      <section>
        <h2>What this project stores</h2>
        <p>This version does not require an account and has no application database for saving essays. To prevent accidental loss after refreshing, progress is stored temporarily in sessionStorage for the current browser tab. Starting over or closing the tab clears this temporary progress.</p>
        <p>The server records only anonymous operational information needed for troubleshooting and cost control, such as request type, duration, token count and error category. It should not log full drafts, topic content or API keys.</p>
      </section>

      <section>
        <h2>OpenAI data handling</h2>
        <p>Requests to the Responses API use <code>store: false</code>, and this application does not create model-response records for later retrieval. According to OpenAI&apos;s official data-controls documentation, API data is not used to train models by default unless the account explicitly opts in. Default abuse-monitoring logs may still contain prompts and responses and are generally retained for up to 30 days. Eligible organisations may apply for stricter retention controls.</p>
        <p><a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noreferrer">Read OpenAI&apos;s official data-controls documentation</a></p>
      </section>

      <section>
        <h2>Limits of AI feedback</h2>
        <p>AI may miss errors, flag correct language or alter the intended meaning. Learners must check all feedback and final revisions. The tool does not replace teacher assessment, fact-checking, reference verification or course rules for AI use.</p>
      </section>

      <section>
        <h2>Public-use safeguards</h2>
        <p>The service limits request frequency, daily use and concurrent requests per visitor, and it applies a site-wide daily allowance. If a limit is reached, the draft remains in the browser so the learner can try again later.</p>
      </section>

      <p className="privacy-updated">Updated: 9 September 2026</p>
    </article>
  </main>;
}
