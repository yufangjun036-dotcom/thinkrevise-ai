"use client";
import { useEffect, useRef, useState } from "react";

type Brief = { title: string; instructions: string; wordLimit: string; criteria: string };
type Check = { requirement: string; status: "met" | "partial" | "missing" | "uncertain"; evidence: string; suggestion: string };
export default function AssignmentReview({ brief, draft, language, headers }: { brief: Brief; draft: string; language: "zh" | "en"; headers: () => Record<string, string> }) {
  const en = language === "en";
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const wordCount = draft.trim().split(/\s+/).filter(Boolean).length;
  const labels = en ? { met: "Addressed", partial: "Partly addressed", missing: "Not found in this draft", uncertain: "Needs your judgement" } : { met: "已回应", partial: "部分回应", missing: "本稿中未找到", uncertain: "需要你核对" };
  async function review() {
    if (controller.current) return;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/assignment-review", { method: "POST", headers: headers(), signal: abort.signal, body: JSON.stringify({ brief, draft, language }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (en ? "Please try again." : "请稍后再试。"));
      if (!abort.signal.aborted) setChecks(data.checks);
    } catch (err) { if (!abort.signal.aborted) setError(err instanceof Error ? err.message : "Request failed"); }
    finally { if (controller.current === abort) { controller.current = null; setBusy(false); } }
  }
  return <section className="assignment-brief" aria-label={en ? "Assignment review" : "作业要求检查"}>
    <h2>{en ? "Assignment review · local trial" : "作业要求检查 · 本地试验"}</h2>
    <p>{en ? "Separate from language feedback; this does not change its results or count. Check these suggestions yourself, not as a grade." : "与语言检查分开，不改变已有语言反馈及数量。这些建议需要你核对，不是作业评分。"}</p>
    {brief.title && <p>{brief.title}</p>}
    <p>{en ? `Current draft: ${wordCount} words` : `当前稿：${wordCount} 词`}{brief.wordLimit && (en ? ` · Entered word limit: ${brief.wordLimit}` : ` · 填写的字数限制：${brief.wordLimit}`)}{en ? " (space-separated estimate; follow your course counting rules)" : "（按空格估算，以课程字数统计规则为准）"}</p>
    {(brief.instructions || brief.criteria) ? <>
      <p>{en ? "Click to send this draft and the four assignment fields to AI in one extra request. No personal or confidential information, please." : "点击后，会将当前稿和四项作业信息发送给 AI，额外使用一次请求。请勿填写个人或保密信息。"}</p>
      <button type="button" className="secondary-button" onClick={review} disabled={busy}>{busy ? (en ? "Checking…" : "正在核对……") : (en ? "Check against assignment" : "核对作业要求")}</button>
    </> : <p>{en ? "Add instructions or marking criteria in task setup for AI review." : "如需 AI 核对，请在任务设置中补充题目要求或评分标准。"}</p>}
    {error && <p role="alert">{error}</p>}
    {checks && <div aria-live="polite">{checks.length === 0 ? <p>{en ? "No reliably assessable requirements returned. This does not prove full compliance." : "未返回可可靠判断的要求；不代表已完全满足作业要求。"}</p> : checks.map((item, index) => <article className="feedback-card" key={index}><strong>{labels[item.status]}</strong><blockquote>{item.requirement}</blockquote><p>{item.evidence}</p>{item.suggestion && <p>{item.suggestion}</p>}</article>)}</div>}
  </section>;
}
