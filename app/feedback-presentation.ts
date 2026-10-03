type Feedback = { category: string; quote: string; why: string; correction?: string; whyEnglish?: string; correctionEnglish?: string; suggestion?: string; question?: string; hints?: string[] };

// Display-only scaffolding: retain original corrections for review and reports.
export function feedbackForMode<T extends Feedback>(item: T, mode: string): T {
  if (mode === "rewrite") return item;
  const language = item.category.startsWith("语言");
  const focus = item.why.startsWith("本句实际修改：")
    ? [...new Set([...item.why.matchAll(/“([^”]+)” →|在“([^”]+)”后补入|删除“([^”]+)”/g)].map(m => m[1] || m[2] || m[3]).filter(word => item.quote.includes(word)))] : [];
  const why = language ? (focus.length ? `Check these parts of the original: ${focus.map(word => `“${word}”`).join(", ")}.` : "Check the highlighted language form in context.")
    : "Consider this suggestion against your meaning, evidence and assignment requirements. It is not a confirmed grammar error.";
  const directions: Array<[RegExp, string]> = [
    [/综合/, "Check noun number, verb forms and sentence structure. Keep the original time, quantity and meaning."],
    [/主谓一致/, "Identify the subject and check whether the verb agrees with it. Preserve the original tense."],
    [/单复数|冠词/, "Check noun number, countability, articles and possessive forms."],
    [/时态|动词/, "Use the time clues to check verb forms and the structures following modal verbs and prepositions."],
    [/拼写/, "Check spelling and capitalisation in context."],
    [/词形/, "Identify the word class needed here, then check its form and surrounding structure."],
    [/完整性|连接|标点/, "Check clause structure, connections and necessary punctuation."]
  ];
  const direction = language ? directions.find(([pattern]) => pattern.test(item.category))?.[1] ?? "Check the marked language forms and try revising them yourself."
    : "Decide whether to accept, adapt or reject the advice. Keep your own intended meaning.";
  const correction = item.correctionEnglish || item.correction || "";
  const arrow = correction.indexOf("→");
  return { ...item, why, whyEnglish: why, correction: direction, correctionEnglish: direction,
    suggestion: mode === "model" ? item.suggestion || (arrow >= 0 ? correction.slice(arrow + 1).trim() : correction) : "", question: "", hints: [] };
}
