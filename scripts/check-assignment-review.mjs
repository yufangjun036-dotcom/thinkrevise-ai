import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = name => fs.readFileSync(path.join(root, name), "utf8");
assert.ok(!source("app/api/coach/route.ts").includes("assignmentBrief"), "Core detection must not consume the assignment brief");
assert.ok(!source("app/assignment-review.tsx").includes('fetch("/api/coach"'), "Assignment review must use its own endpoint");
assert.ok(source("app/api/assignment-review/route.ts").includes("ASSIGNMENT_REVIEW_ENABLED"), "Live review must have an explicit enable switch");
assert.ok(source("app/api/assignment-review/route.ts").includes("acquireAiRequest"), "Additional requests must use the shared quota");
assert.ok(source("app/assignment-review.tsx").includes("controller.current?.abort()"), "Leaving the panel must cancel its request");
console.log("Assignment isolation checks passed.");
if (process.env.TEST_BASE_URL) {
  const url = process.env.TEST_BASE_URL + "/api/assignment-review";
  const draft = "AI helps students learn. Students should check its answers carefully.";
  async function post(body) {
    const response = await fetch(url, {method:"POST", headers:{"Content-Type":"application/json", "X-ThinkRevise-Session":"assignment-regression-test"},body:JSON.stringify(body)});
    return {status:response.status, data:await response.json()};
  }
  const empty = await post({draft,brief:{}});
  assert.equal(empty.status,200); assert.equal(empty.data.provider,"none"); assert.deepEqual(empty.data.checks,[]);
  for (const body of [null, {}, {draft,brief:[]}, {draft,brief:{instructions:12}}, {draft,brief:{instructions:"x".repeat(501)}}, {draft,brief:{wordLimit:"0"}}, {draft:"a".repeat(6001),brief:{}}]) {
    assert.equal((await post(body)).status,400);
  }
  const titleOnly=await post({draft,brief:{title:"Reflection",wordLimit:"500"}});
  assert.equal(titleOnly.status,200); assert.equal(titleOnly.data.provider,"none");
  console.log("Empty, title-only, word count and invalid-input HTTP checks passed.");
}
