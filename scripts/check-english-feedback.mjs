import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL("../app/api/coach/route.ts",import.meta.url),"utf8").replace(/^import .*;\n/gm,"")+"\nexport {attachEnglishFeedback, qualifyReviewedProofClaim, normaliseFeedbackCategory, reviewCandidateFeedback};";
const box={exports:{}};
new Function("exports","require","module",ts.transpileModule(fs.readFileSync(new URL('../app/api/coach/upstream.ts',import.meta.url),'utf8')+'\n'+source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(box.exports,require,box);
const {attachEnglishFeedback,qualifyReviewedProofClaim}=box.exports;
const item={category:"语言准确性 · 主谓一致",quote:"AI help",why:"主谓一致",correction:"help → helps",suggestion:"",confidence:"高"};
const translation={index:0,why:"AI is singular, so use helps in the present tense.",correction:"help → helps"};
assert.equal(attachEnglishFeedback(item,0,[translation]).whyEnglish,translation.why);
assert.equal(attachEnglishFeedback(item,0,[{...translation,sourceQuote:item.quote}]).whyEnglish,translation.why);
assert.equal(attachEnglishFeedback(item,0,[{...translation,sourceQuote:'A different sentence.'}]).whyEnglish,undefined);
assert.equal(attachEnglishFeedback(item,0,[{...translation,correction:"help → helped"}]).whyEnglish,undefined);
assert.equal(attachEnglishFeedback(item,0,[translation,translation]).whyEnglish,undefined);
assert.equal(attachEnglishFeedback(item,0,[]).whyEnglish,undefined);
const evidence={...item,category:'学术建议 · 论证与证据',quote:'Therefore, every university should replace lectures.',why:'无法核实来源，不能支持所有大学的普遍结论。',correction:'该英文替换示例未通过原文匹配或代入检查，因此不作为可直接采用的改句。'};
const draft='A study found that AI raises pass rates by 60 percent. '+evidence.quote;
assert.equal(attachEnglishFeedback(evidence,0,[{index:0,why:'The source is missing.',correction:draft.split('. ')[0]+'.'}],draft).whyEnglish,undefined);
assert.equal(attachEnglishFeedback(evidence,0,[{index:0,why:'The source is missing.',correction:'The replacement was withheld because it failed validation.'}],draft).whyEnglish,undefined);
const valid={index:0,why:'The source cannot be verified and cannot support a universal conclusion for all universities.',correction:'The replacement was withheld because it failed validation; it is not a verified sentence to apply directly.'};
assert.equal(attachEnglishFeedback(evidence,0,[valid],draft).whyEnglish,valid.why);
const originalFetch=globalThis.fetch;
const previousReview=process.env.SENTENCE_LANGUAGE_REVIEW;
process.env.SENTENCE_LANGUAGE_REVIEW='0';
try {
 let calls=0;
 globalThis.fetch=async()=>Response.json({output_text:JSON.stringify({approved:[0],reason:'Valid evidence gap.',modelRevision:'',englishFeedback:[++calls===1?{index:0,why:'The source is missing.',correction:draft.split('. ')[0]+'.'}:valid]})});
 const recovered=await box.exports.reviewCandidateFeedback({feedback:[evidence],modelRevision:''},draft,'test-placeholder',new AbortController().signal);
 assert.equal(calls,2);
 assert.equal(recovered.feedback[0].whyEnglish,valid.why);
 calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({output_text:JSON.stringify({approved:[0],reason:'Valid evidence gap.',modelRevision:'',englishFeedback:[{index:0,why:'The source is missing.',correction:evidence.quote}]})});};
 await assert.rejects(()=>box.exports.reviewCandidateFeedback({feedback:[evidence],modelRevision:''},draft,'test-placeholder',new AbortController().signal),/English feedback validation failed/);
 assert.equal(calls,2,'Invalid translations cannot cause unlimited retries');
} finally {globalThis.fetch=originalFetch;if(previousReview===undefined)delete process.env.SENTENCE_LANGUAGE_REVIEW;else process.env.SENTENCE_LANGUAGE_REVIEW=previousReview;}
const issue={...item,category:"学术建议 · 论证与证据",quote:"Therefore, this proves that every school should replace all teachers.",why:"个体经历不足以支持结论"};
assert.equal(qualifyReviewedProofClaim("Therefore, this proves that AI helps.",[issue]),"Therefore, this suggests that AI helps.");
for(const text of ["This does not prove that AI helps.","The theorem proves that the result holds."]){
 assert.equal(qualifyReviewedProofClaim(text,[issue]),text);
}
assert.equal(qualifyReviewedProofClaim("This proves that the result holds.",[]),"This proves that the result holds.");
console.log("English details and evidence-strength boundary tests passed.");
assert.equal(box.exports.normaliseFeedbackCategory({...issue,category:"语言准确性 · 句子完整性",why:"结论跨度过大，把个案当作充分证明"}).category,"学术建议 · 论证与证据");
