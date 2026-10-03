"use client";

import { useId, useState } from "react";
import { addHistory, checkAttempt, HISTORY_KEY, matchRules, readHistory, selectQuestions, type Feedback, type Selected } from "./engine";

function explanation(rule: string) {
  const rules: Record<string, string> = {
    "agreement.present-be": "Use is with a singular subject and are with a plural subject in these sentences.",
    "agreement.past-be": "Use was with a singular subject and were with a plural subject in these sentences.",
    "agreement.have-agreement": "Use has with a third-person singular subject and have with a plural subject.",
    "agreement.existential-be": "In these formal written sentences, match there is/are or was/were to the following noun.",
    "agreement.singular-present": "A third-person singular subject normally takes an -s or -es verb in the present simple.",
    "agreement.plural-present": "A plural subject takes the base verb in the present simple.",
    "nouns.number-plural": "Use a plural count noun after a number greater than one.",
    "nouns.plural-quantifier": "Words such as many, several and both take plural count nouns.",
    "articles.an-vowel": "Use an before a vowel sound. The sound matters, not just the first letter.",
    "articles.a-consonant": "Use a before a consonant sound.",
    "articles.silent-h": "The h is silent in these words, so use an before the vowel sound.",
    "articles.consonant-sound-vowel-letter": "These words begin with a consonant sound despite their spelling, so use a.",
    "complements.need-to": "When need is the main verb followed by another verb here, use need to + base verb.",
    "word-forms.adverb-manner": "Use an adverb to describe how the action is performed.",
    "pronouns.reflexive": "Use the reflexive form that agrees with the subject: for example, they → themselves.",
  };
  if (rules[rule]) return rules[rule];
  if (rule.startsWith("auxiliaries.")) return "After this modal or do-support auxiliary, use the base form of the main verb.";
  if (rule.startsWith("spelling.")) return "Check the letters in this word. This is practice for the same misspelled word, not a general spelling rule.";
  return "Notice the target change in the reference sentence. Keep the surrounding meaning and time information when revising.";
}

export default function GrammarPractice({ initial, recheck }: { initial: Feedback[]; recheck: Feedback[] }) {
  const [questions, setQuestions] = useState<Selected[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [hidden, setHidden] = useState(true);
  const panelId = useId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  async function start() {
    if (loading) return;
    setLoading(true); setError("");
    try {
      // Deferred until requested: no API call and no question bank in the initial bundle.
      const bank = (await import("./bank.json")).default;
      let history: string[] = [];
      try { history = readHistory(localStorage.getItem(HISTORY_KEY)); } catch { setStorageNotice("Recent-question history is unavailable in this browser."); }
      const selected = selectQuestions(bank, matchRules(initial, recheck, bank), history);
      setQuestions(selected); setAnswers({}); setRevealed(false);
      if (selected.length) try { localStorage.setItem(HISTORY_KEY, JSON.stringify(addHistory(history, selected.map(q => q.id)))); } catch { setStorageNotice("Recent-question history could not be saved. Questions may repeat next time."); }
    } catch { setError("The practice questions could not be loaded. You can retry or skip this optional step."); }
    finally { setLoading(false); }
  }
  return <section className="grammar-practice" aria-label="Optional grammar practice">
    <div className="grammar-practice-heading"><div><p className="overline">Optional · After your revision</p><h2>Want to practise what you revised?</h2><p className="grammar-practice-note">Up to 3 short exercises based on this session. Skip them anytime—saving and finishing are unaffected.</p></div><button type="button" className="secondary-button" aria-expanded={!hidden} aria-controls={panelId} disabled={hidden && loading} onClick={() => { setHidden(!hidden); if (hidden && questions === null && !loading) void start(); }}>{hidden ? (loading ? "Loading practice…" : questions === null ? "Start a short practice" : "Reopen practice") : "Collapse practice"}</button></div>
    <div id={panelId} hidden={hidden}>
    {!hidden && <>
      <p>Try up to three new sentences linked to supported language corrections in this session. Academic and style suggestions are excluded. This does not change your draft or block finishing.</p>
      <p className="grammar-practice-note">No AI call or overall score. A limited local check flags clearly unchanged target errors; other rewrites may need your judgement.</p>
      {loading && <p role="status">Loading practice…</p>}
      {!questions && error && <button type="button" className="secondary-button" disabled={loading} onClick={start}>Retry loading practice</button>}
      {error && <p role="alert">{error}</p>}
      {storageNotice && <p role="status">{storageNotice}</p>}
      {questions?.length === 0 && <p role="status">No reliable question match is available for this feedback. This does not mean your writing has no errors. You can finish without this practice.</p>}
      {!!questions?.length && <form onSubmit={e => { e.preventDefault(); if (questions.every(q => answers[q.id]?.trim())) setRevealed(true); }}>
        <p>Correct one language issue in each sentence. Keep the meaning and other wording where possible. Answers stay hidden until you submit your attempts.</p>
        {questions.map((q, index) => { const status = checkAttempt(q, answers[q.id] || ""); return <article className={`grammar-practice-question${revealed ? ` attempt-${status}` : ""}`} key={q.id}>
          <p className="grammar-practice-note">{index + 1} / {questions.length} · {q.source === "recheck" ? "Linked to recheck feedback" : "Consolidation from initial feedback"}</p>
          <blockquote>{q.prompt}</blockquote>
          <label htmlFor={`practice-${q.id}`}>Your revised sentence</label>
          <textarea id={`practice-${q.id}`} value={answers[q.id] || ""} maxLength={1000} required disabled={revealed} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />
          {revealed && <div className="grammar-practice-answer"><p className="practice-attempt-status" role="status"><strong>{status === "needs-revision" ? "Needs revision · The target error is still present" : status === "reference" ? "Matches a reference answer" : "Review your rewrite · Not automatically marked wrong"}</strong></p><strong>Reference answer</strong><p>{q.referenceAnswer}</p><p>Target change: <b>{q.target.original || "(missing word)"}</b> → <b>{q.target.replacement}</b></p><p>Practice focus: {q.ruleId.replaceAll("-", " ").replace(".", " · ")}</p><p>{explanation(q.ruleId)}</p>{q.acceptedAlternativeAnswers.length > 0 && <p>Another possible answer: {q.acceptedAlternativeAnswers.join(" / ")}</p>}<p>Compare the target change with your attempt. Other correct rewrites may be possible; a different answer is not automatically wrong.</p></div>}
        </article>; })}
        {!revealed ? <button className="primary-button" type="submit" disabled={!questions.every(q => answers[q.id]?.trim())}>Show reference answers</button> : <p role="status">Review the coloured feedback. These limited checks do not assess every possible rewrite or prove mastery.</p>}
      </form>}
    </>}
    </div>
  </section>;
}
