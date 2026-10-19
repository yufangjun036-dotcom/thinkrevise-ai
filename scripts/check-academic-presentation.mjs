import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const box={exports:{}};
new Function('exports','module',ts.transpileModule(fs.readFileSync(new URL('../app/feedback-presentation.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(box.exports,box);
for(const mode of ['coach','model','rewrite']){
 const item={category:'学术建议 · 论证与证据',quote:'These results prove that the tool works for all students.',why:'十二名志愿者且未测试学习效果，不能支持普遍结论。',correction:'限定结论范围，或核对支持该推广的证据。',whyEnglish:'Twelve volunteers and no learning test do not support a conclusion about all students.',correctionEnglish:'Limit the conclusion or check the evidence supporting this generalisation.',suggestion:''};
 assert.deepEqual(box.exports.feedbackForMode(item,mode),item,'Academic diagnosis and direction must not be overwritten by generic scaffolding');
}
const language={category:'语言准确性 · 主谓一致',quote:'People is unsure.',why:'本句实际修改：“is” → “are”。',correction:'People is unsure. → People are unsure.',suggestion:''};
const coach=box.exports.feedbackForMode(language,'coach');assert.ok(coach.why.includes('“is”'));assert.ok(!coach.correction.includes('→'));assert.equal(coach.suggestion,'');
console.log('Academic explanation preserved in all modes; independent language-revision scaffolding unchanged. No AI calls.');
