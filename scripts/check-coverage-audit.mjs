// Offline audit checks: no credentials and no network.
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL("../app/api/coach/route.ts",import.meta.url),"utf8").replace(/^import .*;\n/gm,"")+"\nexport {auditInitialCoverage, localAccuracyDiagnostics, validateLiveResult};";
const box={exports:{}};
new Function("exports","require","module",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(box.exports,require,box);
const f=box.exports, originalFetch=globalThis.fetch;
const mislabeledDraft="Students need check its answers.";
const repaired=f.validateLiveResult({summary:"",feedback:[{category:"语言准确性 · 句子完整性",quote:mislabeledDraft,why:"need 后面通常接不定式；这里缺少 to。",correction:"need check → need to check",suggestion:"",confidence:"高"}],modelRevision:"",overview:[],meaningRisk:""},mislabeledDraft,"coach",0,false,false);
assert.equal(repaired.feedback.length,1,"Do not discard a real complement repair merely because its category was inaccurate");
assert.equal(repaired.feedback[0].category,"语言准确性 · 时态与动词形式");
const draft="Students is using the tool.";
const raw={summary:"",feedback:[],modelRevision:"",overview:[],meaningRisk:""};
const base=f.validateLiveResult(raw,draft,"coach",0,false,false);
const issue={category:"语言准确性 · 主谓一致",quote:"Students is",why:"复数主语搭配 are。",correction:"Students is → Students are",suggestion:"",confidence:"高"};
try {
 globalThis.fetch=async()=>Response.json({output_text:JSON.stringify({feedback:[issue]})});
 const audit=await f.auditInitialCoverage(base,draft,"coach","test-only",new AbortController().signal);
 assert.equal(audit.raw.feedback.length,1);
 assert.ok(audit.result.feedback.some(x=>/students is/i.test(x.quote)));
 assert.equal(base.feedback.length,0,"Audit must not mutate initial candidates");
 const twice=await f.auditInitialCoverage(audit.result,draft,"coach","test-only",new AbortController().signal);
 assert.equal(twice.result.feedback.length,audit.result.feedback.length,"Duplicates must not inflate feedback");
 globalThis.fetch=async()=>Response.json({output_text:JSON.stringify({feedback:[]})});
 assert.deepEqual((await f.auditInitialCoverage(audit.result,draft,"coach","test-only",new AbortController().signal)).result.feedback,audit.result.feedback);
 globalThis.fetch=async()=>Response.json({}, {status:500});
 await assert.rejects(()=>f.auditInitialCoverage(base,draft,"coach","test-only",new AbortController().signal));
 globalThis.fetch=async()=>Response.json({output_text:JSON.stringify({feedback:[{...issue,quote:"Not in this draft"}]})});
 assert.equal((await f.auditInitialCoverage(base,draft,"coach","test-only",new AbortController().signal)).result.feedback.length,0);
} finally { globalThis.fetch=originalFetch; }
const old=process.env.ACCURACY_DIAGNOSTICS;process.env.ACCURACY_DIAGNOSTICS="1";
assert.equal(f.localAccuracyDiagnostics(new Request("https://example.com/api/coach",{headers:{"x-revisioncoach-diagnostic":"stage-counts"}})),false);
assert.equal(f.localAccuracyDiagnostics(new Request("http://127.0.0.1/api/coach")),false);
if(old===undefined)delete process.env.ACCURACY_DIAGNOSTICS;else process.env.ACCURACY_DIAGNOSTICS=old;
console.log("Coverage audit: additions, dedupe, empty output, malformed quote, upstream failure and diagnostic privacy passed.");
