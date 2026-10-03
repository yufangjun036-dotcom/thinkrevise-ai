import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL("../app/api/coach/route.ts",import.meta.url),"utf8").replace(/^import .*;\n/gm,"")+"\nexport {attachEnglishFeedback, qualifyReviewedProofClaim, normaliseFeedbackCategory};";
const box={exports:{}};
new Function("exports","require","module",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(box.exports,require,box);
const {attachEnglishFeedback,qualifyReviewedProofClaim}=box.exports;
const item={category:"语言准确性 · 主谓一致",quote:"AI help",why:"主谓一致",correction:"help → helps",suggestion:"",confidence:"高"};
const translation={index:0,why:"AI is singular, so use helps in the present tense.",correction:"help → helps"};
assert.equal(attachEnglishFeedback(item,0,[translation]).whyEnglish,translation.why);
assert.equal(attachEnglishFeedback(item,0,[{...translation,correction:"help → helped"}]).whyEnglish,undefined);
assert.equal(attachEnglishFeedback(item,0,[translation,translation]).whyEnglish,undefined);
assert.equal(attachEnglishFeedback(item,0,[]).whyEnglish,undefined);
const issue={...item,category:"学术建议 · 论证与证据",quote:"Therefore, this proves that every school should replace all teachers.",why:"个体经历不足以支持结论"};
assert.equal(qualifyReviewedProofClaim("Therefore, this proves that AI helps.",[issue]),"Therefore, this suggests that AI helps.");
for(const text of ["This does not prove that AI helps.","The theorem proves that the result holds."]){
 assert.equal(qualifyReviewedProofClaim(text,[issue]),text);
}
assert.equal(qualifyReviewedProofClaim("This proves that the result holds.",[]),"This proves that the result holds.");
console.log("English details and evidence-strength boundary tests passed.");
assert.equal(box.exports.normaliseFeedbackCategory({...issue,category:"语言准确性 · 句子完整性",why:"结论跨度过大，把个案当作充分证明"}).category,"学术建议 · 论证与证据");
