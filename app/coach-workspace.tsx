"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import Image from "next/image";
import { feedbackForMode } from "./feedback-presentation";
import LinkedRevisionEditor from "./linked-revision-editor";
import AssignmentReview from "./assignment-review";
import Link from "next/link";
import { buildDemoDraft, buildFastDemoDraft, cleanDemoDraft, getDemoMainPoint, helpModes, levels, pickVocabulary, topics, type HelpMode, type LevelId, type TopicId, type VocabularyItem } from "./data";
import { mediaConfig } from "./site-config";
import { countNonWhitespaceCharacters, limitNonWhitespaceCharacters, MAX_RAW_DRAFT_CHARACTERS } from "./text-limits";

type Path = "practice" | "revision";
type Stage = "home" | "setup" | "draft" | "feedback" | "revise" | "reflect";
type RevisionStatus = "partial" | "remaining" | "changed" | "supplemental";
type FeedbackItem = { whyEnglish?: string; correctionEnglish?: string; category: string; quote: string; why: string; correction?: string; question?: string; hints?: string[]; suggestion?: string; confidence: "高" | "中" | "低"; revisionStatus?: RevisionStatus; revisionProgress?: { completed: string[]; pending: string[] } };
type RevisionComparison = { initialCount: number; resolved: Array<Pick<FeedbackItem, "category" | "quote">>; remainingCount: number; partialCount?: number; changedCount: number; supplementalCount: number };
type CoachResponse = { summary: string; feedback: FeedbackItem[]; modelRevision: string; overview: string[]; meaningRisk: string; provider: "openai" | "demo"; fallbackNotice?: string; revisionComparison?: RevisionComparison };
type CustomTopicResult = { inferredDirection: string; words: Array<Pick<VocabularyItem, "word" | "definition" | "collocation" | "example">>; provider: "openai" };
type AssignmentBrief = { title: string; instructions: string; wordLimit: string; criteria: string };
type FeedbackDecision = { issueIndex: number; action: "" | "accept" | "adapt" | "reject" };

const confidenceLabels = { "高": "High", "中": "Medium", "低": "Low" } as const;

function displayCategory(category: string) {
  const replacements: Array<[string, string]> = [
    ["综合语言修改", "Combined language corrections"],
    ["语言准确性", "Language accuracy"], ["学术建议", "Academic guidance"], ["学术表达", "Academic expression"],
    ["语言修改建议", "Language revision suggestion"],
    ["拼写与大小写", "Spelling and capitalisation"], ["拼写错误", "Spelling"], ["主谓一致", "Subject–verb agreement"],
    ["时态与动词形式", "Tense and verb form"], ["时态、名词形式与词形选择", "Tense, noun form and word form"],
    ["时态、名词形式与句子连接", "Tense, noun form and sentence connection"], ["时态、句子结构与冠词", "Tense, sentence structure and articles"],
    ["词形选择", "Word form"], ["词形与名词形式", "Word and noun forms"], ["词形选择与主谓一致", "Word form and agreement"],
    ["冠词与不可数名词", "Articles and uncountable nouns"], ["冠词与名词形式", "Articles and noun forms"],
    ["名词单复数", "Noun number"], ["名词复数与主谓一致", "Noun number and agreement"], ["名词与动词形式", "Noun and verb forms"],
    ["名词形式与动词结构", "Noun form and verb structure"], ["名词形式与所有格", "Noun form and possession"],
    ["所有格与名词形式", "Possession and noun form"], ["句子完整性", "Sentence completeness"],
    ["句子连接与标点", "Sentence connection and punctuation"], ["连写句", "Run-on sentence"], ["介词搭配", "Preposition choice"],
    ["冠词使用", "Article use"], ["不可数名词", "Uncountable nouns"], ["大小写", "Capitalisation"],
    ["论证与证据", "Argument and evidence"], ["论点聚焦", "Claim focus"], ["衔接与连贯", "Cohesion and coherence"],
    ["表达精确性与语域", "Precision and register"], ["个人化表达", "Personal phrasing"], ["非正式表达", "Informal expression"],
    ["口语化且不精确", "Conversational and imprecise wording"], ["口语化数量表达", "Conversational quantity expression"],
    ["时间表达不精确", "Imprecise time expression"], ["口语化表达", "Conversational expression"], ["非正式用词", "Informal wording"],
    ["术语不够精确", "Imprecise terminology"], ["中心观点与文章结构", "Central claim and structure"], ["论证与解释", "Argument and explanation"],
    ["中心观点过于宽泛", "Overbroad central claim"], ["宽泛判断", "Broad evaluation"], ["宽泛的程度表达", "Broad degree expression"],
    ["未经论证的强调", "Unsupported emphasis"], ["绝对化表达", "Absolute claim"], ["过度确定的证据表述", "Overstated evidence"],
  ];
  return replacements.reduce((text, [source, target]) => text.replace(source, target), category);
}

function displayEdit(label: string) {
  return label.replace(/在“([^”]+)”后补入“([^”]+)”/g, 'after “$1”, insert “$2”')
    .replace(/在句首补入“([^”]+)”/g, 'at the start, insert “$1”')
    .replace(/删除“([^”]+)”/g, 'remove “$1”');
}

function displayWhy(item: FeedbackItem) {
  if (item.whyEnglish) return item.whyEnglish;
  return /[\p{Script=Han}]/u.test(item.why)
    ? 'Review the highlighted passage and its suggested correction. An English explanation is unavailable.'
    : item.why;
}

function displayCorrection(item: FeedbackItem) {
  if (item.correctionEnglish) return item.correctionEnglish;
  const correction = item.correction || '';
  if (!/[\p{Script=Han}]/u.test(correction)) return correction || 'Revise this passage in your own words using the guidance above.';
  const replacement = correction.split('。')[0];
  return replacement.includes('→') && !/[\p{Script=Han}]/u.test(replacement)
    ? replacement : 'Review the highlighted passage. An English correction is unavailable; do not treat this as a confirmed repair.';
}

function displaySummary(response: CoachResponse) {
  if (!/[\p{Script=Han}]/u.test(response.summary)) return response.summary;
  return response.feedback.length
    ? `This review located ${response.feedback.length} items, including language checks and academic suggestions. Review each item rather than treating the total as an error count.`
    : "No sufficiently supported, locatable issue was found. This does not guarantee that the text has no problems.";
}

function displayFallbackNotice(response: CoachResponse) {
  if (response.fallbackNotice && !/[\p{Script=Han}]/u.test(response.fallbackNotice)) return response.fallbackNotice;
  if (response.provider === "openai") return "AI judgements may be wrong. Review each item yourself.";
  return response.fallbackNotice
    ? "Live AI is temporarily unavailable, so the system has switched to preconfigured demo feedback."
    : "No API key is required; suitable for demonstrations and temporary fallback.";
}

function isCoachResponse(value: unknown): value is CoachResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CoachResponse>;
  return typeof candidate.summary === "string"
    && Array.isArray(candidate.feedback)
    && typeof candidate.modelRevision === "string"
    && (candidate.provider === "openai" || candidate.provider === "demo");
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    throw new Error("The service returned an unexpected response. Please try again; your draft is still saved on this page.");
  }
}

function apiRequestHeaders() {
  const key = "thinkrevise-anonymous-session";
  const legacyKey = "revisioncoach-anonymous-session";
  let session = window.sessionStorage.getItem(key) ?? window.sessionStorage.getItem(legacyKey);
  if (!session) {
    const bytes = new Uint8Array(16);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
    session = `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
    window.sessionStorage.setItem(key, session);
  }
  if (!window.sessionStorage.getItem(key)) window.sessionStorage.setItem(key, session);
  return { "Content-Type": "application/json", "X-ThinkRevise-Session": session };
}

const revisionLoopSlides = [
  {
    label: "Original idea",
    sample: "Online learning is useful for university students...",
    note: "Start with your own ideas; the first draft does not need to be perfect.",
  },
  {
    label: "AI diagnosis",
    sample: "“Useful” is too broad here; readers still do not know the specific benefit.",
    note: "AI locates and explains issues without doing the thinking for you.",
  },
  {
    label: "Your revision",
    sample: "Online learning gives students more flexible access...",
    note: "Use the feedback to make the idea more specific in your own words.",
  },
  {
    label: "Complete and reflect",
    sample: "Online learning can widen access by reducing limits of time and place.",
    note: "Compare the versions and identify a principle you can use next time.",
  },
] as const;

const DEFAULT_GOAL = "";
const DEFAULT_WEAKNESS = "";
const SESSION_RECOVERY_KEY = "thinkrevise-session-v1";
const LEGACY_SESSION_RECOVERY_KEY = "revisioncoach-session-v1";
const EMPTY_ASSIGNMENT_BRIEF: AssignmentBrief = { title: "", instructions: "", wordLimit: "", criteria: "" };

function clampText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.slice(0, maximum) : "";
}

function normaliseAssignmentBrief(value: unknown): AssignmentBrief | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<AssignmentBrief>;
  const brief = {
    title: clampText(candidate.title, 120),
    instructions: clampText(candidate.instructions, 500),
    wordLimit: clampText(candidate.wordLimit, 5).replace(/\D/g, ""),
    criteria: clampText(candidate.criteria, 500),
  };
  return Object.values(brief).some(Boolean) ? brief : null;
}

function encodeTaskBrief(brief: AssignmentBrief) {
  const bytes = new TextEncoder().encode(JSON.stringify(brief));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeTaskBrief(encoded: string) {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return normaliseAssignmentBrief(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

type HighlightRange = { start: number; end: number; issueIndexes: number[] };

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function limitWords(text: string, maximum: number) {
  const matches = Array.from(text.matchAll(/\S+/g));
  if (matches.length <= maximum) return text;
  const lastWord = matches[maximum - 1];
  return text.slice(0, (lastWord.index ?? 0) + lastWord[0].length);
}

function findHighlightRanges(text: string, feedback: FeedbackItem[]) {
  const lowerText = text.toLocaleLowerCase();
  const ranges: HighlightRange[] = [];

  feedback.forEach((item, issueIndex) => {
    const quote = item.quote.trim().replace(/^[“”"']+|[“”"']+$/g, "");
    if (quote.length < 2) return;
    const lowerQuote = quote.toLocaleLowerCase();
    let searchFrom = 0;
    while (searchFrom < lowerText.length) {
      const start = lowerText.indexOf(lowerQuote, searchFrom);
      if (start === -1) break;
      ranges.push({ start, end: start + quote.length, issueIndexes: [issueIndex] });
      searchFrom = start + Math.max(quote.length, 1);
    }
  });

  return ranges
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .reduce<HighlightRange[]>((merged, range) => {
      const previous = merged.at(-1);
      if (previous && range.start < previous.end) {
        previous.end = Math.max(previous.end, range.end);
        previous.issueIndexes = Array.from(new Set([...previous.issueIndexes, ...range.issueIndexes]));
      } else merged.push({ ...range, issueIndexes: [...range.issueIndexes] });
      return merged;
    }, []);
}

function HighlightedDraft({ text, feedback }: { text: string; feedback: FeedbackItem[] }) {
  const ranges = findHighlightRanges(text, feedback);
  if (ranges.length === 0) return <>{text}</>;

  const content: ReactNode[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) content.push(text.slice(cursor, range.start));
    content.push(<mark className="draft-error-mark" key={`${range.start}-${range.end}`} title="Issue located by AI">{text.slice(range.start, range.end)}</mark>);
    cursor = range.end;
  }
  if (cursor < text.length) content.push(text.slice(cursor));
  return <>{content}</>;
}

function InteractiveHighlightedDraft({
  text,
  feedback,
  activeIssue,
  pinnedIssue,
  onShowIssue,
  onPinIssue,
  onDismiss,
  issueRefs,
}: {
  text: string;
  feedback: FeedbackItem[];
  activeIssue: number | null;
  pinnedIssue: number | null;
  onShowIssue: (index: number | null) => void;
  onPinIssue: (index: number, sourceStart: number) => void;
  onDismiss: () => void;
  issueRefs: RefObject<Map<number, HTMLButtonElement>>;
}) {
  const ranges = findHighlightRanges(text, feedback);
  if (ranges.length === 0) return <>{text}</>;

  const content: ReactNode[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) content.push(text.slice(cursor, range.start));
    const issueIndex = range.issueIndexes.includes(activeIssue ?? -1) ? activeIssue! : range.issueIndexes[0];
    const item = feedback[issueIndex];
    const isOpen = activeIssue !== null && range.issueIndexes.includes(activeIssue);
    content.push(
      <span className="draft-error-wrap" key={`${range.start}-${range.end}`} onMouseEnter={() => { if (pinnedIssue === null && window.matchMedia("(min-width: 641px) and (hover: hover)").matches) onShowIssue(range.issueIndexes[0]); }} onMouseLeave={() => { if (pinnedIssue === null) onShowIssue(null); }}>
        <button
          type="button"
          className={`draft-error-mark interactive ${isOpen ? "active" : ""}`}
          ref={(node) => {
            if (node) for (const index of range.issueIndexes) {
              if (!issueRefs.current.has(index)) issueRefs.current.set(index, node);
            }
          }}
          aria-label={`View issue: ${range.issueIndexes.map((index) => displayCategory(feedback[index].category)).join(", ")}`}
          aria-expanded={isOpen}
          onFocus={(event) => { if (pinnedIssue === null && event.currentTarget.matches(":focus-visible")) onShowIssue(range.issueIndexes[0]); }}
          onBlur={() => { if (pinnedIssue === null) onShowIssue(null); }}
          onClick={() => onPinIssue(issueIndex, text.toLocaleLowerCase().indexOf(item.quote.trim().replace(/^[“”"']+|[“”"']+$/g, "").toLocaleLowerCase(), range.start))}
        >
          {text.slice(range.start, range.end)}
        </button>
        {isOpen && item && <span className="inline-issue-popover" role="dialog" aria-label={`Revision guidance for issue ${issueIndex + 1}`}>
          <span className="inline-issue-heading"><strong>Issue {issueIndex + 1} / {feedback.length} · {displayCategory(item.category)}</strong><button type="button" onClick={onDismiss} aria-label="Close revision guidance">×</button></span>
          <span className="inline-issue-copy">{displayWhy(item)}</span>
          <span className="inline-issue-label">How to revise</span>
          <span className="inline-issue-copy correction">{displayCorrection(item)}</span>
          {range.issueIndexes.length > 1 && <small>This location is linked to {range.issueIndexes.length} issues. Use the issue navigator above to review each one.</small>}
          <em>{pinnedIssue === issueIndex ? "This guidance is pinned and will stay visible while you edit." : "Click the underlined text to pin this guidance."}</em>
        </span>}
      </span>,
    );
    cursor = range.end;
  }
  if (cursor < text.length) content.push(text.slice(cursor));
  return <>{content}</>;
}

function ArrowIcon({ back = false }: { back?: boolean }) {
  return <svg className={back ? "back-icon" : ""} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
}

function SparkIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8c.7 4.9 3.3 7.5 8.2 8.2-4.9.7-7.5 3.3-8.2 8.2-.7-4.9-3.3-7.5-8.2-8.2 4.9-.7 7.5-3.3 8.2-8.2Z" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <button className="brand brand-button" type="button" onClick={() => { window.sessionStorage.removeItem(SESSION_RECOVERY_KEY); window.sessionStorage.removeItem(LEGACY_SESSION_RECOVERY_KEY); window.location.reload(); }} aria-label="Return to the ThinkRevise AI home page and start again"><span className="brand-mark">T</span><span><strong>ThinkRevise AI</strong>{!compact && <small>Academic Writing Coach</small>}</span></button>;
}

function Progress({ stage, helpMode }: { stage: Stage; helpMode: HelpMode }) {
  if (helpMode === "rewrite") {
    const stages: Stage[] = ["setup", "draft", "revise"];
    const labels = ["Choose mode", "Add your draft", "Review revision"];
    const index = Math.max(0, stages.indexOf(stage));
    return <div className="step-progress" aria-label={`Current step: ${labels[index]}`}><div className="step-progress-copy"><span>Editing progress</span><strong>{index + 1} / 3 · {labels[index]}</strong></div><div className="step-progress-track"><span style={{ width: `${((index + 1) / 3) * 100}%` }} /></div></div>;
  }
  const stages: Stage[] = ["setup", "draft", "feedback", "revise", "reflect"];
  const labels = ["Set your task", "Complete draft", "Review feedback", "Revise yourself", "Recheck and reflect"];
  const index = Math.max(0, stages.indexOf(stage));
  return <div className="step-progress" aria-label={`Current step: ${labels[index]}`}><div className="step-progress-copy"><span>Learning progress</span><strong>{index + 1} / 5 · {labels[index]}</strong></div><div className="step-progress-track"><span style={{ width: `${((index + 1) / 5) * 100}%` }} /></div></div>;
}

export default function CoachWorkspace() {
  const [stage, setStage] = useState<Stage>("home");
  const [path, setPath] = useState<Path>("practice");
  const [topic, setTopic] = useState<TopicId>("education-ai");
  const [customTopic, setCustomTopic] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");
  const [customInterpretation, setCustomInterpretation] = useState<Pick<CustomTopicResult, "inferredDirection"> | null>(null);
  const [level, setLevel] = useState<LevelId>("intermediate");
  const [words, setWords] = useState<VocabularyItem[]>([]);
  const [openWord, setOpenWord] = useState<string | null>(null);
  const [helpMode, setHelpMode] = useState<HelpMode>("coach");
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [draft, setDraft] = useState("");
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [isResolvingTopic, setIsResolvingTopic] = useState(false);
  const [demoNotice, setDemoNotice] = useState("");
  const lastDemo = useRef("");
  const demoRequest = useRef(0);
  const topicController = useRef<AbortController | null>(null);
  const demoDraftController = useRef<AbortController | null>(null);
  const feedbackController = useRef<AbortController | null>(null);
  const revisionController = useRef<AbortController | null>(null);
  const [selfCheck, setSelfCheck] = useState({ mainPoint: "", strongest: "", weakness: DEFAULT_WEAKNESS, help: DEFAULT_GOAL });
  const [response, setResponse] = useState<CoachResponse | null>(null);
  const displayFeedback = useMemo(() => response?.feedback.map(item => feedbackForMode(item, helpMode)) ?? [], [response, helpMode]);
  const [revisionResponse, setRevisionResponse] = useState<CoachResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [error, setError] = useState("");
  const [revisionError, setRevisionError] = useState("");
  const [revisedDraft, setRevisedDraft] = useState("");
  const [finalDraft, setFinalDraft] = useState("");
  const [reflection, setReflection] = useState("");
  const [recordCopied, setRecordCopied] = useState(false);
  const [assignmentBrief, setAssignmentBrief] = useState<AssignmentBrief>(EMPTY_ASSIGNMENT_BRIEF);
  const [taskLinkCopied, setTaskLinkCopied] = useState(false);
  const [feedbackDecisions, setFeedbackDecisions] = useState<FeedbackDecision[]>([]);
  const [activeIssue, setActiveIssue] = useState<number | null>(null);
  const [pinnedIssue, setPinnedIssue] = useState<number | null>(null);
  const [linkedSourceStart, setLinkedSourceStart] = useState<number | undefined>();
  const [locationNavigationId, setLocationNavigationId] = useState(0);
  const [loopStep, setLoopStep] = useState(0);
  const loopDragStartX = useRef<number | null>(null);
  const draftRef = useRef("");
  const issueRefs = useRef(new Map<number, HTMLButtonElement>());
  const [recoveryReady, setRecoveryReady] = useState(false);

  const selectedTopic = topics.find((item) => item.id === topic) ?? topics[0];
  const activeTopicLabel = topic === "custom" ? customInterpretation?.inferredDirection || "Custom direction" : selectedTopic.label;
  const topicContext = topic === "custom"
    ? `Learner-described topic: ${customTopic.trim() || activeTopicLabel}. Interpreted direction: ${activeTopicLabel}`
    : `Current topic: ${activeTopicLabel}`;
  const canContinueSetup = path !== "practice" || topic !== "custom" || Boolean(customTopic.trim());
  const draftWordCount = useMemo(() => countWords(draft), [draft]);
  const revisedWordCount = useMemo(() => countWords(revisedDraft), [revisedDraft]);
  const draftNonWhitespaceCount = useMemo(() => countNonWhitespaceCharacters(draft), [draft]);
  const revisedNonWhitespaceCount = useMemo(() => countNonWhitespaceCharacters(revisedDraft), [revisedDraft]);
  const usedWords = useMemo(() => new Set(words
    .filter((item) => new RegExp(`(^|[^A-Za-z])${item.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z]|$)`, "i").test(draft))
    .map((item) => item.word)), [draft, words]);

  function updateDraft(value: string) {
    const nextValue = path === "practice" ? limitWords(value, 300) : limitNonWhitespaceCharacters(value);
    draftRef.current = nextValue;
    setDraft(nextValue);
  }

  function updateRevisedDraft(value: string) {
    setRevisedDraft(path === "practice" ? limitWords(value, 300) : limitNonWhitespaceCharacters(value));
    setRevisionError("");
  }

  function showIssue(index: number, pin = false) {
    const normalized = response?.feedback.length ? (index + response.feedback.length) % response.feedback.length : 0;
    setActiveIssue(normalized);
    setPinnedIssue(pin ? normalized : null);
    setLinkedSourceStart(undefined);
    setLocationNavigationId(value => value + 1);
    window.requestAnimationFrame(() => {
      const mark = issueRefs.current.get(normalized);
      mark?.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
      mark?.focus({ preventScroll: true });
    });
  }

  function dismissIssue() {
    setActiveIssue(null);
    setPinnedIssue(null);
    setLinkedSourceStart(undefined);
  }

  function pinLinkedIssue(index: number, sourceStart: number) {
    if (pinnedIssue === index && linkedSourceStart === sourceStart) { dismissIssue(); return; }
    setActiveIssue(index);
    setPinnedIssue(index);
    setLinkedSourceStart(sourceStart);
    setLocationNavigationId(value => value + 1);
  }

  function moveLoop(direction: -1 | 1) {
    setLoopStep((current) => (current + direction + revisionLoopSlides.length) % revisionLoopSlides.length);
  }

  function finishLoopDrag(clientX: number) {
    if (loopDragStartX.current === null) return;
    const distance = clientX - loopDragStartX.current;
    loopDragStartX.current = null;
    if (Math.abs(distance) < 42) return;
    moveLoop(distance < 0 ? 1 : -1);
  }

  useEffect(() => {
    let saved: Record<string, unknown> | null = null;
    const sharedBrief = window.location.hash.startsWith("#task=")
      ? decodeTaskBrief(window.location.hash.slice(6))
      : null;
    try {
      const raw = window.sessionStorage.getItem(SESSION_RECOVERY_KEY)
        ?? window.sessionStorage.getItem(LEGACY_SESSION_RECOVERY_KEY);
      if (raw) saved = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      window.sessionStorage.removeItem(SESSION_RECOVERY_KEY);
      window.sessionStorage.removeItem(LEGACY_SESSION_RECOVERY_KEY);
    }
    window.queueMicrotask(() => {
      if (sharedBrief) {
        setPath("revision");
        setAssignmentBrief(sharedBrief);
        setStage("setup");
        setDemoNotice("A teacher-shared assignment brief has been loaded. Review it before choosing your support mode.");
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      } else if (saved?.version === 1 && typeof saved.stage === "string" && saved.stage !== "home") {
          const savedDraft = typeof saved.draft === "string" ? limitNonWhitespaceCharacters(saved.draft) : "";
          const savedResponse = isCoachResponse(saved.response) ? saved.response : null;
          const savedRevisionResponse = isCoachResponse(saved.revisionResponse) ? saved.revisionResponse : null;
          const requestedStage = ["setup", "draft", "feedback", "revise", "reflect"].includes(saved.stage) ? saved.stage as Stage : "draft";
          const restoredStage = requestedStage === "reflect" && !savedRevisionResponse
            ? (savedResponse ? "revise" : "draft")
            : (requestedStage === "feedback" || requestedStage === "revise") && !savedResponse
              ? "draft"
              : requestedStage;
          draftRef.current = savedDraft;
          setDraft(savedDraft);
          if (saved.path === "practice" || saved.path === "revision") setPath(saved.path);
          if (topics.some((item) => item.id === saved.topic)) setTopic(saved.topic as TopicId);
          if (levels.some((item) => item.id === saved.level)) setLevel(saved.level as LevelId);
          if (helpModes.some((item) => item.id === saved.helpMode)) setHelpMode(saved.helpMode as HelpMode);
          setStage(restoredStage);
          if (typeof saved.customTopic === "string") setCustomTopic(saved.customTopic);
          if (typeof saved.customQuestion === "string") setCustomQuestion(saved.customQuestion);
          if (saved.customInterpretation && typeof saved.customInterpretation === "object") setCustomInterpretation(saved.customInterpretation as Pick<CustomTopicResult, "inferredDirection">);
          if (Array.isArray(saved.words)) setWords(saved.words as VocabularyItem[]);
          if (typeof saved.goal === "string") setGoal(saved.goal);
          if (saved.selfCheck && typeof saved.selfCheck === "object") setSelfCheck(saved.selfCheck as typeof selfCheck);
          setResponse(savedResponse);
          setRevisionResponse(savedRevisionResponse);
          if (typeof saved.revisedDraft === "string") setRevisedDraft(limitNonWhitespaceCharacters(saved.revisedDraft));
          if (typeof saved.finalDraft === "string") setFinalDraft(limitNonWhitespaceCharacters(saved.finalDraft));
          if (typeof saved.reflection === "string") setReflection(saved.reflection.slice(0, 1000));
          const savedBrief = normaliseAssignmentBrief(saved.assignmentBrief);
          if (savedBrief) setAssignmentBrief(savedBrief);
          const savedDecisions = Array.isArray(saved.feedbackDecisions) ? saved.feedbackDecisions : saved.feedbackDecision ? [saved.feedbackDecision] : [];
          const restored: FeedbackDecision[] = [];
          for (const value of savedDecisions) {
            if (!value || typeof value !== "object") continue;
            const item = value as Partial<FeedbackDecision>;
            const index = Number(item.issueIndex);
            if (Number.isInteger(index) && index >= 0 && index < (savedResponse?.feedback.length ?? 0)
              && ["accept", "adapt", "reject"].includes(item.action ?? "")
              && !restored.some(decision => decision.issueIndex === index)) {
              restored.push({ issueIndex: index, action: item.action as FeedbackDecision["action"] });
            }
          }
          setFeedbackDecisions(restored);
          setDemoNotice("Your writing progress from before this tab was refreshed has been restored. Please review it before continuing.");
      }
      setRecoveryReady(true);
    });
  }, []);

  useEffect(() => {
    if (!recoveryReady) return;
    if (stage === "home" && !draft && !revisedDraft) {
      window.sessionStorage.removeItem(SESSION_RECOVERY_KEY);
      return;
    }
    try {
      window.sessionStorage.setItem(SESSION_RECOVERY_KEY, JSON.stringify({
        version: 1, stage, path, topic, customTopic, customQuestion, customInterpretation,
        level, words, helpMode, goal, draft, selfCheck, response, revisionResponse,
        revisedDraft, finalDraft, reflection, assignmentBrief, feedbackDecisions,
      }));
      window.sessionStorage.removeItem(LEGACY_SESSION_RECOVERY_KEY);
    } catch {
      // Storage can be disabled or full. The active page remains usable.
    }
  }, [recoveryReady, stage, path, topic, customTopic, customQuestion, customInterpretation, level, words, helpMode, goal, draft, selfCheck, response, revisionResponse, revisedDraft, finalDraft, reflection, assignmentBrief, feedbackDecisions]);

  useEffect(() => () => {
    topicController.current?.abort();
    demoDraftController.current?.abort();
    feedbackController.current?.abort();
    revisionController.current?.abort();
  }, []);

  useEffect(() => {
    const modelContext = (document as Document & {
      modelContext?: {
        registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void>;
      };
    }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(modelContext.registerTool({
      name: "start_revision_session",
      title: "Start an English revision activity",
      description: "Begin a theme writing activity or academic English revision flow on this page.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string", enum: ["practice", "revision"] } },
        required: ["path"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as { path?: unknown };
        if (value.path !== "practice" && value.path !== "revision") throw new Error("path must be practice or revision");
        draftRef.current = "";
        setDraft("");
        setIsResolvingTopic(false);
        setSelfCheck({ mainPoint: "", strongest: "", weakness: DEFAULT_WEAKNESS, help: DEFAULT_GOAL });
        setWords([]);
        setCustomInterpretation(null);
        setOpenWord(null);
        setResponse(null);
        setRevisionResponse(null);
        setError("");
        setRevisionError("");
        setRevisedDraft("");
        setFinalDraft("");
        setReflection("");
        setRecordCopied(false);
        setAssignmentBrief(EMPTY_ASSIGNMENT_BRIEF);
        setTaskLinkCopied(false);
        setFeedbackDecisions([]);
        dismissIssue();
        issueRefs.current.clear();
        setPath(value.path);
        if (value.path === "practice") setHelpMode("coach");
        setStage("setup");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return { status: "ready", path: value.path, visibleStage: "setup" };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  function resetLearningWork() {
    demoRequest.current += 1;
    topicController.current?.abort();
    topicController.current = null;
    demoDraftController.current?.abort();
    demoDraftController.current = null;
    feedbackController.current?.abort();
    feedbackController.current = null;
    revisionController.current?.abort();
    revisionController.current = null;
    setIsLoading(false);
    setIsReanalyzing(false);
    setIsGeneratingDemo(false);
    setIsResolvingTopic(false);
    setDemoNotice("");
    lastDemo.current = "";
    setCustomInterpretation(null);
    updateDraft("");
    setSelfCheck({ mainPoint: "", strongest: "", weakness: DEFAULT_WEAKNESS, help: DEFAULT_GOAL });
    setWords([]);
    setOpenWord(null);
    setResponse(null);
    setRevisionResponse(null);
    setError("");
    setRevisionError("");
    setRevisedDraft("");
    setFinalDraft("");
    setReflection("");
    setRecordCopied(false);
    setAssignmentBrief(EMPTY_ASSIGNMENT_BRIEF);
    setTaskLinkCopied(false);
    setFeedbackDecisions([]);
    dismissIssue();
    issueRefs.current.clear();
  }

  function selectTopic(nextTopic: TopicId) {
    if (nextTopic !== topic) resetLearningWork();
    setTopic(nextTopic);
  }

  function selectLevel(nextLevel: LevelId) {
    if (nextLevel !== level) resetLearningWork();
    setLevel(nextLevel);
  }

  function updateCustomTopic(value: string) {
    if (draft || response) resetLearningWork();
    setCustomInterpretation(null);
    setCustomTopic(value);
  }

  function updateCustomQuestion(value: string) {
    if (draft || response) resetLearningWork();
    setCustomInterpretation(null);
    setCustomQuestion(value);
  }

  function startPath(nextPath: Path) {
    resetLearningWork();
    setPath(nextPath);
    if (nextPath === "practice") setHelpMode("coach");
    setStage("setup"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateAssignmentBrief(field: keyof AssignmentBrief, value: string) {
    const maximum = field === "title" ? 120 : field === "wordLimit" ? 5 : 500;
    const nextValue = field === "wordLimit" ? value.replace(/\D/g, "").slice(0, maximum) : value.slice(0, maximum);
    setAssignmentBrief((current) => ({ ...current, [field]: nextValue }));
    setTaskLinkCopied(false);
  }

  async function copyTeacherTaskLink() {
    if (!Object.values(assignmentBrief).some((value) => value.trim())) {
      setError("Add at least one assignment detail before creating a task link.");
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}#task=${encodeTaskBrief(assignmentBrief)}`;
    try {
      await navigator.clipboard.writeText(url);
      setTaskLinkCopied(true);
      setError("");
    } catch {
      setError("The task link could not be copied automatically. Please check your browser's clipboard permission and try again.");
    }
  }

  function buildLearningRecord() {
    if (!response || !revisionResponse) return "";
    const comparison = revisionResponse.revisionComparison;
    const assignmentLines = Object.values(assignmentBrief).some(Boolean)
      ? `Assignment title: ${assignmentBrief.title || "Not provided"}\nAssignment instructions: ${assignmentBrief.instructions || "Not provided"}\nWord limit: ${assignmentBrief.wordLimit || "Not provided"}\nMarking criteria: ${assignmentBrief.criteria || "Not provided"}\n`
      : "";
    const decisionLines = feedbackDecisions.filter(item => item.action && response.feedback[item.issueIndex]).sort((a, b) => a.issueIndex - b.issueIndex).map(decision => {
      const item = response.feedback[decision.issueIndex];
      return `Feedback decision: ${decision.action.toUpperCase()} · Issue ${decision.issueIndex + 1} (${displayCategory(item.category)}: ${item.quote})\n`;
    }).join("");
    const details = "\n\nFirst-round feedback\n" + response.feedback.map((item, i) => `${i+1}. ${displayCategory(item.category)}\nLocation: ${item.quote}\n${displayWhy(item)}\n${displayCorrection(item)}`).join("\n\n") + "\n\nSecond-draft feedback\n" + revisionResponse.feedback.map((item, i) => `${i+1}. ${displayCategory(item.category)} [${item.revisionStatus ?? ""}]\n${displayCorrection(item)}\nCompleted: ${item.revisionProgress?.completed.map(displayEdit).join("; ") ?? ""}\nPending: ${item.revisionProgress?.pending.map(displayEdit).join("; ") ?? ""}`).join("\n\n");
    return `ThinkRevise AI learning record\n${assignmentLines}${path === "practice" ? `Practice topic: ${activeTopicLabel}\n` : ""}Initial self-assessment: ${selfCheck.weakness || "Not provided (optional)"}\nSession goal: ${goal || "No specific focus"}\nInitial diagnosis: ${response.feedback.length} items\n${decisionLines}${comparison ? `Not detected again: ${comparison.resolved.length} items\nOriginal issues remaining: ${comparison.remainingCount} items\nRevised locations needing attention: ${comparison.changedCount} items\nMissed initially (found on recheck): ${comparison.supplementalCount} items` : `Second-draft review: ${revisionResponse.feedback.length} items still need attention`}\nOriginal draft: ${draft}\nSecond draft: ${revisedDraft}\nFinal academic version: ${finalDraft}\nReflection: ${reflection}${details}\nFeedback items may contain several edits; item counts are not error counts. AI feedback requires human verification.`;
  }

  function downloadLearningRecord() {
    const record = buildLearningRecord();
    if (!record) return;
    const blob = new Blob(["\uFEFF", record], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = (assignmentBrief.title || "thinkrevise-learning-record").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "thinkrevise-learning-record";
    link.href = url;
    link.download = `${safeTitle}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function resolveCustomTopic() {
    if (topicController.current) return false;
    const description = customTopic.trim();
    if (description.length < 6) {
      setError("Please describe what you genuinely want to write about in at least a few sentences.");
      return false;
    }
    const requestId = ++demoRequest.current;
    const controller = new AbortController();
    topicController.current = controller;
    setIsResolvingTopic(true);
    setError("");
    try {
      const result = await fetch("/api/custom-topic", {
        method: "POST",
        signal: controller.signal,
        headers: apiRequestHeaders(),
        body: JSON.stringify({ description, question: customQuestion.trim(), level, count: levels.find((item) => item.id === level)?.count ?? 8, variation: `request-${requestId}` }),
      });
      const data = await readJsonResponse<Partial<CustomTopicResult> & { error?: string }>(result);
      if (requestId !== demoRequest.current) return false;
      if (!result.ok) throw new Error(data.error || "We could not interpret this direction just now.");
      if (data.provider !== "openai" || typeof data.inferredDirection !== "string" || !Array.isArray(data.words)) {
        throw new Error("The topic interpretation was incomplete. Please try again.");
      }
      const mappedWords: VocabularyItem[] = data.words.map((item, index) => ({
        ...item,
        topics: ["custom" as const],
        level: index < 6 ? "beginner" as const : index < 8 ? "intermediate" as const : "challenge" as const,
      }));
      if (mappedWords.length < (levels.find((item) => item.id === level)?.count ?? 8)) throw new Error("Not enough target words were generated. Please try again.");
      setCustomInterpretation({ inferredDirection: data.inferredDirection });
      setWords(mappedWords);
      return true;
    } catch (requestError) {
      if (requestId !== demoRequest.current) return false;
      if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "We could not interpret this direction. Please try again later.");
      return false;
    } finally {
      if (topicController.current === controller) topicController.current = null;
      if (requestId === demoRequest.current) setIsResolvingTopic(false);
    }
  }

  async function beginDraft() {
    if (!canContinueSetup) return;
    setError("");
    if (path === "practice") {
      if (topic === "custom") {
        const understood = await resolveCustomTopic();
        if (!understood) return;
      } else {
        setWords(pickVocabulary(topic, level));
      }
    }
    setStage("draft");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function redrawWords() {
    if (topicController.current) return;
    demoRequest.current += 1;
    demoDraftController.current?.abort();
    demoDraftController.current = null;
    setIsGeneratingDemo(false);
    setError("");
    if (topic === "custom") {
      const understood = await resolveCustomTopic();
      if (!understood) return;
    } else {
      setWords(pickVocabulary(topic, level));
    }
    setOpenWord(null);
    setResponse(null);
    setRevisionResponse(null);
    setRevisedDraft("");
    setFinalDraft("");
    if (draft && draft === lastDemo.current) {
      updateDraft("");
      setSelfCheck({ mainPoint: "", strongest: "", weakness: DEFAULT_WEAKNESS, help: goal });
      setDemoNotice("The target words have changed. Generate the demo draft again to create a new matching text.");
    } else {
      setDemoNotice(draft ? "The target words have changed and your draft has been kept. Review the new words or generate another demo draft." : "The target words have changed. You can start writing or generate a demo draft.");
    }
  }

  async function fillDemoDraft() {
    if (demoDraftController.current) return;
    if (path !== "practice") {
      updateDraft(cleanDemoDraft(buildDemoDraft("education-ai", [])));
      if (helpMode !== "rewrite") setSelfCheck({ ...selfCheck, mainPoint: getDemoMainPoint("education-ai"), weakness: "Several areas need improvement; I would like a comprehensive diagnosis" });
      return;
    }
    const requestId = ++demoRequest.current;
    const previousAiDraft = lastDemo.current;
    const startingDraft = draftRef.current;
    const quickDraft = buildFastDemoDraft(topic, words);
    setResponse(null);
    setRevisionResponse(null);
    setRevisedDraft("");
    setFinalDraft("");
    setSelfCheck({ mainPoint: getDemoMainPoint(topic, customTopic), strongest: "", weakness: "Several areas need improvement; I would like a comprehensive diagnosis", help: goal });
    setDemoNotice("Generating a new demo draft that matches this direction and all target words…");
    setIsGeneratingDemo(true);
    setError("");
    const controller = new AbortController();
    demoDraftController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const result = await fetch("/api/demo-draft", {
        method: "POST", signal: controller.signal, headers: apiRequestHeaders(),
        body: JSON.stringify({ topic: `${topicContext}. Generate an English demo draft within this topic while allowing the learner to choose their own position.`, words: words.map((word) => word.word), previousDraft: previousAiDraft }),
      });
      const data = await readJsonResponse<{ draft: string; mainPoint: string; error?: string }>(result);
      if (requestId !== demoRequest.current) return;
      if (!result.ok) throw new Error(data.error || "We could not generate a demo draft just now. Please try again.");
      if (draftRef.current !== startingDraft) return;
      updateDraft(data.draft); lastDemo.current = data.draft;
      setResponse(null);
      setRevisionResponse(null);
      setRevisedDraft("");
      setFinalDraft("");
      setSelfCheck({ mainPoint: data.mainPoint, strongest: "", weakness: "Several areas need improvement; I would like a comprehensive diagnosis", help: goal });
      setDemoNotice("A new demo draft containing every target word has been generated. Its errors are intentional practice material.");
    } catch {
      if (requestId !== demoRequest.current || draftRef.current !== startingDraft) return;
      updateDraft(quickDraft);
      lastDemo.current = quickDraft;
      setDemoNotice("Live AI did not respond in time, so a backup practice draft containing all target words has been added. You can generate another draft if you wish.");
    } finally {
      window.clearTimeout(timeout);
      if (demoDraftController.current === controller) demoDraftController.current = null;
      if (requestId === demoRequest.current) setIsGeneratingDemo(false);
    }
  }

  async function requestFeedback() {
    if (feedbackController.current) return;
    demoRequest.current += 1;
    setError("");
    setRevisionError("");
    if (countNonWhitespaceCharacters(draft) < 20) { setError("Please enter an English draft containing at least 20 non-whitespace characters. You can also use the demo draft."); return; }
    setResponse(null);
    setRevisionResponse(null);
    setRecordCopied(false);
    dismissIssue();
    issueRefs.current.clear();
    const controller = new AbortController();
    feedbackController.current = controller;
    setIsLoading(true);
    try {
      const result = await fetch("/api/coach", { method: "POST", signal: controller.signal, headers: apiRequestHeaders(), body: JSON.stringify({ draft, mode: helpMode, goal, selfCheck, taskPrompt: path === "practice" ? topicContext : undefined }) });
      const data = await readJsonResponse<CoachResponse & { error?: string }>(result);
      if (controller.signal.aborted) return;
      if (!result.ok) throw new Error(data.error || "We could not analyse this text just now.");
      setResponse(data);
      setRevisionResponse(null);
      setFeedbackDecisions([]);
      setRevisedDraft(draft);
      setFinalDraft("");
      setStage(helpMode === "rewrite" ? "revise" : "feedback");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "We could not analyse the text. Please try again later; your draft is still saved on this page.");
    } finally {
      if (feedbackController.current === controller) {
        feedbackController.current = null;
        setIsLoading(false);
      }
    }
  }


  function updateFeedbackDecision(issueIndex: number, patch: Partial<FeedbackDecision>) {
    setFeedbackDecisions(current => {
      const previous = current.find(item => item.issueIndex === issueIndex) ?? { issueIndex, action: "" as const };
      return [...current.filter(item => item.issueIndex !== issueIndex), { ...previous, ...patch, issueIndex }];
    });
  }

  function renderFeedbackDecision(index: number) {
    const decision = feedbackDecisions.find(item => item.issueIndex === index);
    const labels = { accept: "Accept", adapt: "Adapt", reject: "Reject" } as const;
    return <div className="feedback-choice">
      <fieldset className="decision-field"><legend>Your decision</legend><div>
        {(Object.keys(labels) as Array<keyof typeof labels>).map(action => <button key={action} type="button" aria-pressed={decision?.action === action} className={decision?.action === action ? "active" : ""} onClick={() => updateFeedbackDecision(index, { action: decision?.action === action ? "" : action })}>{labels[action]}</button>)}
      </div></fieldset>
    </div>;
  }

  async function reanalyzeSecondDraft() {
    if (revisionController.current) return;
    setRevisionError("");
    const trimmedRevision = revisedDraft.trim();
    if (countNonWhitespaceCharacters(trimmedRevision) < 20) {
      setRevisionError("Please complete a second draft containing at least 20 non-whitespace characters.");
      return;
    }
    if (trimmedRevision === draft.trim()) {
      setRevisionError("The second draft has not changed yet. Make at least one revision based on the feedback before submitting it for another review.");
      return;
    }
    if (!response) return;
    setRevisionResponse(null);
    const controller = new AbortController();
    revisionController.current = controller;
    setIsReanalyzing(true);
    try {
      const result = await fetch("/api/coach", {
        method: "POST",
        signal: controller.signal,
        headers: apiRequestHeaders(),
        body: JSON.stringify({
          phase: "revision",
          draft: trimmedRevision,
          originalDraft: draft,
          mode: "rewrite",
          goal: "Recheck issues that remain in the second draft and generate a final academic version",
          selfCheck,
          taskPrompt: path === "practice" ? topicContext : undefined,
          priorFeedback: response.feedback.map(({ category, quote, why, correction, confidence }) => ({
            category: category.slice(0, 500),
            quote: quote.slice(0, 500),
            why: why.slice(0, 500),
            correction: (correction || "").slice(0, 500),
            confidence,
          })),
        }),
      });
      const data = await readJsonResponse<CoachResponse & { error?: string }>(result);
      if (controller.signal.aborted) return;
      if (!result.ok) throw new Error(data.error || "We could not reanalyse the second draft just now.");
      const secondAnalysis = data as CoachResponse;
      setRevisionResponse(secondAnalysis);
      setFinalDraft(secondAnalysis.modelRevision || trimmedRevision);
      setStage("reflect");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      if (!controller.signal.aborted) setRevisionError(requestError instanceof Error ? requestError.message : "We could not reanalyse the second draft. Please try again later; your second draft is still saved on this page.");
    } finally {
      if (revisionController.current === controller) {
        revisionController.current = null;
        setIsReanalyzing(false);
      }
    }
  }

  function goBack() {
    demoRequest.current += 1;
    topicController.current?.abort();
    topicController.current = null;
    demoDraftController.current?.abort();
    demoDraftController.current = null;
    feedbackController.current?.abort();
    feedbackController.current = null;
    revisionController.current?.abort();
    revisionController.current = null;
    setIsLoading(false);
    setIsReanalyzing(false);
    setIsGeneratingDemo(false);
    const previous: Record<Exclude<Stage, "home">, Stage> = { setup: "home", draft: "setup", feedback: "draft", revise: helpMode === "rewrite" ? "draft" : "feedback", reflect: "revise" };
    if (stage !== "home") setStage(previous[stage]);
  }

  if (stage === "home") {
    const loopSlide = revisionLoopSlides[loopStep];
    return <main className="site-shell">
      <header className="topbar"><Brand /><div className="prototype-badge"><span aria-hidden="true" /> English candidate</div></header>
      <section className="hero" id="top"><div className="hero-copy"><p className="overline">Designed for multilingual university students</p><h1>Start with a first draft. <span>See how your writing improves.</span></h1><p className="hero-intro">Keep ownership of your ideas, then use carefully scoped AI support to identify issues, revise your text and explain what you have learned.</p><div className="learning-loop" aria-label="Learning process"><span>Think first</span><i /><span>Review feedback</span><i /><span>Revise yourself</span></div></div>
      {mediaConfig.homeHeroImage ? <figure className="hero-image-card"><Image src={mediaConfig.homeHeroImage} alt={mediaConfig.homeHeroAlt} fill sizes="(max-width: 900px) 100vw, 38vw" priority /><figcaption>Keep your own position, then decide how to use AI feedback.</figcaption></figure> : <div className="progress-card" aria-label="Four-step revision cycle; swipe left or right" onPointerDown={(event) => { loopDragStartX.current = event.clientX; }} onPointerUp={(event) => finishLoopDrag(event.clientX)} onPointerCancel={() => { loopDragStartX.current = null; }}><div className="progress-topline"><span>Your revision cycle</span><strong>{loopStep + 1} / {revisionLoopSlides.length}</strong></div><div className="progress-track"><span style={{ width: `${((loopStep + 1) / revisionLoopSlides.length) * 100}%` }} /></div><div className="paper-preview" aria-live="polite"><span className="paper-label">{loopSlide.label}</span><p>{loopSlide.sample}</p><div className="feedback-line"><SparkIcon /><span>{loopSlide.note}</span></div></div><div className="loop-navigation"><button type="button" className="loop-arrow" onClick={() => moveLoop(-1)} aria-label="Previous revision step"><ArrowIcon back /></button><div className="loop-dots" aria-label="Choose a revision step">{revisionLoopSlides.map((slide, index) => <button key={slide.label} type="button" className={index === loopStep ? "active" : ""} onClick={() => setLoopStep(index)} aria-label={`Step ${index + 1}: ${slide.label}`} aria-current={index === loopStep ? "step" : undefined} />)}</div><button type="button" className="loop-arrow" onClick={() => moveLoop(1)} aria-label="Next revision step"><ArrowIcon /></button></div><p className="ownership-note">Swipe to see the complete process · AI does not think for you</p></div>}</section>
      <section className="mode-section" aria-labelledby="mode-title"><div className="section-heading"><div><p className="overline">Choose a starting point</p><h2 id="mode-title">How would you like to practise today?</h2></div><p>Both options use the same draft–feedback–revision–reflection learning cycle.</p></div>
      <div className="mode-grid"><button className="mode-card practice-card" type="button" onClick={() => startPath("practice")}><span className="card-number">01</span><span className="card-kicker">Start with target words</span><strong>Theme Writing Practice</strong><span className="card-description">Choose a topic, receive English target words suited to your level and write a short text expressing your own position.</span><span className="word-cloud"><i>evidence</i><i>access</i><i>engage</i><i>reflect</i><i>however</i></span><span className="card-cta">Start writing practice <ArrowIcon /></span></button>
      <button className="mode-card revision-card" type="button" onClick={() => startPath("revision")}><span className="card-number">02</span><span className="card-kicker">Start with your draft</span><strong>Academic English Revision</strong><span className="card-description">Paste an English draft that may contain errors or informal language, then choose diagnosis, limited AI collaboration or a full rewrite.</span><span className="revision-sample"><span className="sample-row muted">I think this result is really good...</span><span className="sample-connector" /><span className="sample-row improved">The findings indicate a positive outcome...</span></span><span className="card-cta">Open the revision studio <ArrowIcon /></span></button></div></section>
      <footer><p>Designed for learning, not for replacing your thinking.</p><span>No sign-in required · Demo content is not made public automatically · <Link href="/privacy">Privacy and AI use</Link></span></footer>
    </main>;
  }

  return <main className="workspace-shell"><header className="workspace-header"><Brand compact /><Progress stage={stage} helpMode={helpMode} /><div className="prototype-badge"><span /> English candidate</div></header><div className="workspace-body"><button className="back-button" type="button" onClick={goBack}><ArrowIcon back /> Back</button>
    {path === "revision" && response && (stage === "feedback" || stage === "reflect") && Object.values(assignmentBrief).some(value => value.trim()) && <AssignmentReview key={JSON.stringify([stage, stage === "reflect" ? revisedDraft : draft, assignmentBrief])} brief={assignmentBrief} draft={stage === "reflect" ? revisedDraft : draft} language="en" headers={apiRequestHeaders} />}
    {stage === "setup" && <section className="flow-panel setup-panel"><div className="flow-heading"><p className="overline">Step 1 · Set your task</p><h1>{path === "practice" ? "Prepare a theme writing activity" : "How would you like AI to support you?"}</h1><p>{path === "practice" ? "Choose a topic context first. You decide the position and angle; the system uses the topic only to select relevant vocabulary." : "More direct support may be faster, but it also leaves fewer opportunities for you to think and revise independently."}</p></div>
      {path === "practice" ? <div className="setup-columns"><fieldset className="choice-fieldset"><legend>Choose or describe a topic that interests you</legend><div className="topic-choices">{topics.map((item) => <button key={item.id} type="button" aria-pressed={topic === item.id} className={topic === item.id ? "active" : ""} onClick={() => selectTopic(item.id)}><span>{item.label}</span><small>{item.prompt}</small></button>)}</div>{topic === "custom" && <div className="custom-topic-fields"><label><span>Describe your direction <em>Required</em></span><textarea value={customTopic} maxLength={200} onChange={(event) => updateCustomTopic(event.target.value)} placeholder="For example: I want to discuss how short-video recommendations influence young people's tastes, choices and communities." /></label><label><span>Add the angle you want to explore <em>Optional</em></span><textarea value={customQuestion} maxLength={300} onChange={(event) => updateCustomQuestion(event.target.value)} placeholder="For example: I want to compare individual choice with platform influence." /></label><small>Use one to three sentences to describe any situation, relationship, experience or social issue. You do not need to name a formal topic. The system will match English target words without prescribing a question you must answer.</small></div>}</fieldset><fieldset className="choice-fieldset"><legend>Choose a level</legend><div className="level-choices">{levels.map((item) => <button key={item.id} type="button" aria-pressed={level === item.id} className={level === item.id ? "active" : ""} onClick={() => selectLevel(item.id)}><strong>{item.label}</strong><span>{item.count} target words</span><small>{item.description}</small></button>)}</div></fieldset></div> : <><section className="assignment-brief" aria-labelledby="assignment-brief-title"><div className="assignment-brief-heading"><div><span className="mini-step">Optional assignment context</span><h2 id="assignment-brief-title">Assignment Brief (optional)</h2><p>Just checking your own writing? Leave these fields blank and continue. Add details only if you have assignment requirements. After language feedback, separately check the assignment. Clicking check sends the current draft and these details to AI in one extra request.</p></div><button className="secondary-button" type="button" onClick={copyTeacherTaskLink}>{taskLinkCopied ? "Assignment link copied" : "Share assignment requirements"}</button></div><div className="assignment-brief-fields"><label><span>Assignment title</span><input value={assignmentBrief.title} maxLength={120} onChange={(event) => updateAssignmentBrief("title", event.target.value)} placeholder="For example: Critical reflection on AI in education" /></label><label><span>Word limit</span><input value={assignmentBrief.wordLimit} inputMode="numeric" maxLength={5} onChange={(event) => updateAssignmentBrief("wordLimit", event.target.value)} placeholder="For example: 800" /></label><label className="wide"><span>Instructions or question</span><textarea value={assignmentBrief.instructions} maxLength={500} onChange={(event) => updateAssignmentBrief("instructions", event.target.value)} placeholder="Paste the assignment question or main instructions." /></label><label className="wide"><span>Marking criteria</span><textarea value={assignmentBrief.criteria} maxLength={500} onChange={(event) => updateAssignmentBrief("criteria", event.target.value)} placeholder="Add the criteria that you need to check while revising." /></label></div><small className="privacy-note">The shared link contains only these task settings—never a student draft, feedback or personal information.</small></section><fieldset className="choice-fieldset"><legend>Choose the level of support</legend><div className="help-grid">{helpModes.map((item, index) => <button key={item.id} type="button" aria-pressed={helpMode === item.id} className={`${helpMode === item.id ? "active" : ""} ${item.id === "rewrite" ? "editing-mode" : ""}`} onClick={() => setHelpMode(item.id)}><span className="mode-index">0{index + 1}</span><strong>{item.name}</strong><p>{item.description}</p><em>{item.learning}</em></button>)}</div></fieldset>{helpMode === "rewrite" && <div className="integrity-notice"><SparkIcon /><div><strong>This is editing mode, not learning mode</strong><p>AI will rewrite the full text without overwriting your draft or adding facts, data or citations that were not in it. Follow your course rules for AI use.</p></div></div>}</>}
      {error && <p className="error-message" role="alert">{error}</p>}<button className="primary-button wide-action" type="button" onClick={beginDraft} disabled={!canContinueSetup || isResolvingTopic}>{isResolvingTopic ? "Interpreting your writing direction…" : "Continue to your draft"} <ArrowIcon /></button></section>}

    {stage === "draft" && <section className="flow-panel draft-panel"><div className="flow-heading compact-heading"><p className="overline">Step 2 · Your first draft</p><h1>{path === "practice" ? "Write freely within this direction" : "Paste your own English draft"}</h1><p>{path === "practice" ? `Current direction: ${activeTopicLabel}. You choose the position. Aim for 80–150 words and use the target words naturally.` : "Remove names, student numbers and other personal information. AI will not overwrite your original draft."}</p></div>
      {path === "practice" && <div className="vocabulary-panel"><div className="panel-title-row"><div><span>Target words</span><strong>Used {usedWords.size} / {words.length} · Aim for at least {Math.min(6, words.length)}</strong></div><button type="button" onClick={redrawWords}>Draw again</button></div><div className="vocabulary-list">{words.map((item) => <button key={item.word} type="button" className={`${openWord === item.word ? "open" : ""} ${usedWords.has(item.word) ? "used" : ""}`} onClick={() => setOpenWord(openWord === item.word ? null : item.word)}><span className="vocabulary-term"><strong>{item.word}</strong></span><span>{openWord === item.word ? "Hide" : usedWords.has(item.word) ? "Used ✓" : "View hints"}</span>{openWord === item.word && <div><p><b>Collocation:</b>{item.collocation}</p><p><b>Example:</b>{item.example}</p></div>}</button>)}</div></div>}
      <label className="text-field draft-field"><span>English draft</span><textarea value={draft} readOnly={isGeneratingDemo} maxLength={path === "practice" ? 6000 : MAX_RAW_DRAFT_CHARACTERS} onChange={(event) => updateDraft(event.target.value)} placeholder="Type or paste your English here…" /><small className={(path === "practice" && draftWordCount >= 300) || (path === "revision" && draftNonWhitespaceCount >= 6000) ? "limit-reached" : ""}>{path === "practice" ? `${draftWordCount} / 300 words${draftWordCount >= 300 ? " · Limit reached" : ""}` : `${draftWordCount} words · ${draftNonWhitespaceCount} / 6000 non-whitespace characters${draftNonWhitespaceCount >= 6000 ? " · Limit reached" : ""}`} · Used only for this feedback session</small></label>
      <div className="draft-tools"><button className="secondary-button" type="button" disabled={isGeneratingDemo || isLoading} onClick={fillDemoDraft}>{isGeneratingDemo ? "Generating a new draft with this set of target words…" : path === "practice" ? "Add a demo draft for this direction (uses all target words)" : "Add a demo draft"}</button></div>
      {demoNotice && <p className="demo-status" role="status">{demoNotice}</p>}
      {helpMode !== "rewrite" && <div className="self-check"><div><span className="mini-step">Before AI analysis</span><h2>First-draft self-assessment (optional)</h2><p>You can leave every field blank and get AI feedback directly. If provided, your assessment will be kept alongside the AI diagnosis so you can compare your judgement with external feedback and observe how your revision skills develop. The demo button above also fills in a sample response.</p></div><label><span>Summarise the central claim of this text.</span><input value={selfCheck.mainPoint} maxLength={500} onChange={(event) => setSelfCheck({ ...selfCheck, mainPoint: event.target.value })} placeholder="Optional: write a brief summary" /></label><label><span>Which sentence is currently the clearest or most effective?</span><input value={selfCheck.strongest} maxLength={500} onChange={(event) => setSelfCheck({ ...selfCheck, strongest: event.target.value })} placeholder="Optional: paste a sentence from your draft" /></label><label><span>What most needs improvement in this draft?</span><select value={selfCheck.weakness} onChange={(event) => setSelfCheck({ ...selfCheck, weakness: event.target.value })}><option value="">Skip for now (optional)</option><option>The central claim is not sufficiently focused or clear</option><option>The argument needs stronger reasons or evidence</option><option>The structure is loose or connections between paragraphs are unclear</option><option>The academic register is inappropriate or too conversational</option><option>The vocabulary range is limited, vague or repetitive</option><option>Language accuracy needs work, including spelling, grammar or tense</option><option>Several areas need improvement; I would like a comprehensive diagnosis</option><option>I am not sure yet and would like AI feedback to help me decide</option></select></label><label><span>What should AI focus on in this session?</span><select value={goal} onChange={(event) => { setGoal(event.target.value); setSelfCheck({ ...selfCheck, help: event.target.value }); }}><option value="">No specific focus — check normally (optional)</option><option>Clarify and focus the central claim</option><option>Strengthen structure and logical connections between paragraphs</option><option>Improve academic register and precision</option><option>Develop the argument and explain evidence more fully</option><option>Check spelling, grammar and tense</option><option>Provide a comprehensive diagnosis</option></select></label></div>}
      {error && <p className="error-message" role="alert">{error}</p>}<button className="primary-button wide-action" type="button" onClick={requestFeedback} disabled={isLoading || isGeneratingDemo}>{isLoading ? "Analysing the draft…" : helpMode === "rewrite" ? "Generate a full academic rewrite" : "Analyse and locate issues"}<ArrowIcon /></button></section>}

    {stage === "feedback" && response && <section className="flow-panel feedback-panel"><div className="flow-heading compact-heading"><p className="overline">Step 3 · Overall diagnosis</p><h1>What should you revise?</h1><p>{displaySummary(response)}</p></div><ProviderBadge response={response} />{response.feedback.length === 0 ? <><div className="integrity-notice"><CheckIcon /><div><strong>No reliably locatable issues found</strong><p>This does not guarantee that the text is perfect. You can return to refine the draft or finish this session; the system will not invent feedback to reach a quota.</p></div></div><div className="finish-actions"><button className="secondary-button" type="button" onClick={() => setStage("draft")}>Return to the draft</button><button className="primary-button" type="button" onClick={() => { resetLearningWork(); setStage("home"); }}>Finish and return home <ArrowIcon /></button></div></> : <><p className="decision-guidance">Record decisions on as many suggestions as you like. Selections do not change your text automatically.</p><div className="feedback-grid">{displayFeedback.map((item, index) => <article className="feedback-card" key={`${item.category}-${index}`}><div className="feedback-card-top"><span>Issue {index + 1}</span><em>AI confidence: {confidenceLabels[item.confidence]}</em></div><h2>{displayCategory(item.category)}</h2><blockquote>Location: {item.quote}</blockquote><h3>Why this needs attention</h3><p>{displayWhy(item)}</p><h3>How to revise</h3><p className="correction-copy">{displayCorrection(item)}</p>{helpMode === "model" && item.suggestion && <details className="local-example"><summary>View a local revision example</summary><div><span>For reference only, not a replacement draft</span><p>{item.suggestion}</p></div></details>}{renderFeedbackDecision(index)}</article>)}</div><div className="integrity-notice"><SparkIcon /><div><strong>Now revise the full text yourself</strong><p>{helpMode === "model" ? "Local examples only clarify individual issues; they do not complete the whole text for you. After you submit a second draft, all three versions will be kept for comparison." : "Revise the draft using the diagnosis above. After submission, the system will generate an academic version that addresses remaining issues and preserve your first and second drafts for comparison."}</p></div></div><button className="primary-button wide-action" type="button" onClick={() => setStage("revise")}>View highlights and start revising <ArrowIcon /></button></>}</section>}

    {stage === "revise" && response && helpMode === "rewrite" && <section className="flow-panel revise-panel direct-rewrite-panel"><div className="flow-heading compact-heading"><p className="overline">Step 3 · Full rewrite</p><h1>Original draft and academic version</h1><p>AI has corrected the language and adjusted the academic register. Check that the revision preserves your intended meaning, facts and position.</p></div><div className="comparison-grid"><div className="version-pane locked"><div><span>Original draft</span><strong>{draftWordCount} words</strong></div><aside className="draft-highlight-legend"><i />Red underlining shows revised locations</aside><p><HighlightedDraft text={draft} feedback={response.feedback} /></p></div><article className="version-pane final direct-result"><div><span>Full academic rewrite</span><strong>{response.modelRevision.trim().split(/\s+/).filter(Boolean).length} words</strong></div><p>{response.modelRevision}</p></article></div><div className="ai-record editing-record"><div><SparkIcon /><span>Editing mode</span></div><p>This version was generated directly by AI and involves the least learner participation. Disclose AI use according to your course rules and verify the content yourself.</p></div><div className="finish-actions"><button className="secondary-button" type="button" onClick={async () => { await navigator.clipboard.writeText(response.modelRevision); setRecordCopied(true); }}>{recordCopied ? "Rewrite copied" : "Copy full rewrite"}</button><button className="primary-button" type="button" onClick={() => { resetLearningWork(); setStage("home"); }}>Finish and return home <ArrowIcon /></button></div></section>}

    {stage === "revise" && response && helpMode !== "rewrite" && <section className="flow-panel revise-panel">
      <div className="flow-heading compact-heading"><p className="overline">Step 4 · Revise it yourself</p><h1>Turn the feedback into your own second draft</h1><p>The original draft on the left highlights feedback locations in red; complete your revision on the right. {helpMode === "model" ? "Return to the previous page if you need to review a local example." : "The system will not rewrite the draft in advance."}</p></div>
      <ProviderBadge response={response} />
      <div className="comparison-grid revision-comparison"><div className="version-pane locked interactive-original"><div><span>Original draft with issue locations</span><strong>{draftWordCount} words</strong></div><div className="issue-navigator" aria-label="Review each issue"><button type="button" onClick={() => showIssue((activeIssue ?? 0) - 1, true)} aria-label="Previous issue"><ArrowIcon back /></button><button type="button" className="issue-position" onClick={() => showIssue(activeIssue ?? 0, true)}>{activeIssue === null ? `View all ${response.feedback.length} issues` : `Issue ${activeIssue + 1} / ${response.feedback.length} · ${displayCategory(response.feedback[activeIssue]?.category || "")}`}</button><button type="button" onClick={() => showIssue((activeIssue ?? -1) + 1, true)} aria-label="Next issue"><ArrowIcon /></button></div><aside className="draft-highlight-legend"><i />Hover for guidance; click to pin and locate the matching passage</aside><p className="interactive-draft-copy"><InteractiveHighlightedDraft text={draft} feedback={displayFeedback} activeIssue={activeIssue} pinnedIssue={pinnedIssue} onShowIssue={setActiveIssue} onPinIssue={pinLinkedIssue} onDismiss={dismissIssue} issueRefs={issueRefs} /></p></div><div className="version-pane editable linked-revision-pane"><div><label htmlFor="revision-draft-input">Your second draft</label><strong>{path === "practice" ? `${revisedWordCount} / 300 words` : `${revisedWordCount} words · ${revisedNonWhitespaceCount} / 6000 non-whitespace characters`}</strong></div><LinkedRevisionEditor original={draft} value={revisedDraft} onChange={updateRevisedDraft} issue={pinnedIssue !== null && response.feedback[pinnedIssue] ? {index: pinnedIssue, quote: response.feedback[pinnedIssue].quote, sourceStart: linkedSourceStart} : null} navigationId={locationNavigationId} maxLength={path === "practice" ? 6000 : MAX_RAW_DRAFT_CHARACTERS} /></div></div>
      <details className="revision-decisions"><summary>Review your feedback decisions · {feedbackDecisions.filter(item => item.action).length} / {response.feedback.length}</summary><p className="decision-guidance">You can change your decisions here. You do not need to select every suggestion.</p>{response.feedback.map((item, index) => <article key={index}><strong>Issue {index + 1} · {displayCategory(item.category)}</strong><blockquote>{item.quote}</blockquote>{renderFeedbackDecision(index)}</article>)}</details>
      {revisionError && <p className="error-message" role="alert">{revisionError}</p>}
      <button className="primary-button wide-action" type="button" disabled={isReanalyzing || countNonWhitespaceCharacters(revisedDraft) < 20} onClick={reanalyzeSecondDraft}>{isReanalyzing ? "Reanalysing the second draft…" : "Submit and reanalyse the second draft"} <ArrowIcon /></button>
      <p className="second-check-note">The system will recheck issues that remain and generate a final academic version based on your second draft.</p>
    </section>}

    {stage === "reflect" && response && revisionResponse && <section className="flow-panel reflection-panel">
      <div className="completion-mark"><CheckIcon /></div>
      <div className="flow-heading centered"><p className="overline">Step 5 · Recheck and final version</p><h1>AI has reanalysed your second draft</h1><p>The final version is based on your second draft and addresses only the issues that remain after rechecking. It does not revert to a version generated during the first analysis.</p></div>
      <ProviderBadge response={revisionResponse} />
      <div className={`revision-audit ${revisionResponse.feedback.length === 0 ? "clear" : "remaining"}`}>
        {revisionResponse.revisionComparison ? <div className="revision-audit-grid">
          <div><span>Initial diagnosis</span><strong>{revisionResponse.revisionComparison.initialCount}</strong><small>items</small></div>
          <div className="resolved"><span>Not detected again</span><strong>{revisionResponse.revisionComparison.resolved.length}</strong><small>items</small></div>
          <div className="partial"><span>Partly revised</span><strong>{revisionResponse.revisionComparison.partialCount ?? 0}</strong><small>items</small></div><div><span>Original issues remaining</span><strong>{revisionResponse.revisionComparison.remainingCount}</strong><small>items</small></div>
          <div><span>Revised locations needing attention</span><strong>{revisionResponse.revisionComparison.changedCount}</strong><small>items</small></div>
          <div><span>Missed initially (found on recheck)</span><strong>{revisionResponse.revisionComparison.supplementalCount}</strong><small>items</small></div>
        </div> : <div className="revision-audit-grid legacy"><div><span>Initial diagnosis</span><strong>{response.feedback.length}</strong><small>items</small></div><div><span>Second-draft review</span><strong>{revisionResponse.feedback.length}</strong><small>items</small></div></div>}
        <p>{revisionResponse.feedback.length === 0 ? "The independent recheck found no reliably locatable issues. You still need to verify the intended meaning and facts in the final version." : "The second draft was checked independently using the same standard. If an issue already existed in the original but was recognised only now, it is explicitly marked as an initial miss."}</p>
      </div>
      {revisionResponse.revisionComparison?.resolved.length ? <div className="resolved-issue-list"><h2>Original issues not detected again</h2>{revisionResponse.revisionComparison.resolved.map((item, index) => <span key={`${item.category}-${item.quote}-${index}`}><CheckIcon />{displayCategory(item.category)}: {item.quote}</span>)}</div> : null}
      {revisionResponse.feedback.length > 0 && <div className="revision-review-list"><h2>Issues that still need attention</h2>{revisionResponse.feedback.map((item, index) => <article key={`${item.category}-${index}`}><div className="revision-issue-title"><strong>{index + 1}. {displayCategory(item.category)}</strong>{item.revisionStatus && <span className={`revision-status ${item.revisionStatus}`}>{item.revisionStatus === "partial" ? "Partly revised" : item.revisionStatus === "remaining" ? "Original issue remains" : item.revisionStatus === "changed" ? "Revised location needs attention" : "Missed initially (found on recheck)"}</span>}</div><blockquote>{item.quote}</blockquote><div className="revision-repair-detail">{item.revisionProgress && <><p className="completed-edits"><strong>Completed: </strong>{item.revisionProgress.completed.map(displayEdit).join("; ")}</p><p><strong>Still to revise: </strong>{item.revisionProgress.pending.map(displayEdit).join("; ")}</p></>}<p>{displayCorrection(item)}</p></div></article>)}</div>}
      <div className="final-version-stack">
        <article className="version-pane locked"><div><span>Original draft</span><strong>{draftWordCount} words</strong></div><p>{draft}</p></article>
        <article className="version-pane locked"><div><span>Your second draft</span><strong>{revisedWordCount} words</strong></div>{revisionResponse.feedback.length > 0 && <aside className="draft-highlight-legend"><i />Red underlining shows issues that remain after rechecking</aside>}<p><HighlightedDraft text={revisedDraft} feedback={revisionResponse.feedback} /></p></article>
        <article className="version-pane final"><div><span>Final academic version based on your second draft</span><strong>{finalDraft.trim().split(/\s+/).filter(Boolean).length} words</strong></div><p>{finalDraft}</p></article>
      </div>
      <div className="reflection-fields"><label><span>Learning reflection</span><strong>After comparing the original, second and final versions, what is the most important revision principle you learned?</strong><textarea value={reflection} maxLength={1000} onChange={(event) => setReflection(event.target.value)} placeholder="Write your reflection here…" /></label></div>
      <div className="ai-record"><div><SparkIcon /><span>Record of AI contribution</span></div><p>AI first diagnosed the original draft; the learner independently completed a second draft; AI then reanalysed it and addressed remaining issues. The learner must still verify the facts, position and course requirements.</p></div>
      <div className="finish-actions report-actions"><button className="secondary-button" type="button" disabled={!reflection.trim()} onClick={async () => { await navigator.clipboard.writeText(buildLearningRecord()); setRecordCopied(true); }}>{recordCopied ? "Learning record copied" : "Copy learning record"}</button><button className="secondary-button" type="button" disabled={!reflection.trim()} onClick={downloadLearningRecord}>Download learning report</button><button className="primary-button" type="button" disabled={!reflection.trim()} onClick={() => { resetLearningWork(); setStage("home"); }}>Finish and return home <ArrowIcon /></button></div>
    </section>}
  </div></main>;
}

function ProviderBadge({ response }: { response: CoachResponse }) {
  const languageCount = response.feedback.filter(item => item.category.startsWith("语言") || item.category.startsWith("Language")).length;
  return <><div className={`provider-status ${response.provider}`}><span /><strong>{response.provider === "openai" ? "Live AI feedback" : "Demo feedback mode"}</strong><p>{displayFallbackNotice(response)}</p></div>
    <p className="second-check-note">This session contains {languageCount} language checks and {response.feedback.length - languageCount} academic or expression suggestions. Academic suggestions are not confirmed grammar errors; whether to accept them depends on your intended meaning, evidence and writing requirements. The total below combines both kinds of feedback and is not an error count.</p></>;
}
