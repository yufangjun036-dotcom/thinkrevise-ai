import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workspace = await readFile(new URL("../app/coach-workspace.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

assert.ok(layout.includes('lang="en"'), "The English root metadata must use lang=en");
assert.ok(workspace.includes("Academic Writing Coach"), "The visible brand must identify the English product");
assert.ok(workspace.includes("English candidate"), "The candidate badge must identify the English build");
assert.ok(workspace.includes("Theme Writing Practice"), "The English theme-writing entry point is missing");
assert.ok(workspace.includes("Academic English Revision"), "The English revision entry point is missing");
assert.ok(workspace.includes('["语言修改建议", "Language revision suggestion"]'), "Generic language feedback headings must be translated");
assert.ok(workspace.includes("<b>Collocation:</b>{item.collocation}"), "Target words must provide an English collocation");
assert.ok(workspace.includes("<b>Example:</b>{item.example}"), "Target words must provide an English example");
assert.ok(!workspace.includes("<small>{item.definition}</small>"), "Target-word cards must not display translations below the word");
assert.ok(!workspace.includes("<b>中文：</b>"), "Target-word hints must not display Chinese translations");
assert.ok(workspace.includes('path === "practice" ? limitWords(value, 300) : limitNonWhitespaceCharacters(value)'), "Each writing path must enforce its intended limit");
assert.ok(workspace.includes("InteractiveHighlightedDraft"), "Learner revision must connect feedback to highlighted source text");
assert.ok(styles.includes(".inline-issue-popover"), "Inline issue feedback must have visible popover styling");
assert.ok(styles.includes(".issue-navigator"), "Long drafts must include previous/next issue navigation");

console.log("English-interface copy checks passed.");
