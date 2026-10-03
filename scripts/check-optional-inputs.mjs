import assert from "node:assert/strict";
import fs from "node:fs";
const text=fs.readFileSync(new URL("../app/coach-workspace.tsx",import.meta.url),"utf8");
const prefix=text.split("async function requestFeedback() {")[1].split("    setResponse(null);")[0];
const submit=new Function("draft","selfCheck","helpMode","feedbackController","demoRequest","setError","setRevisionError","countNonWhitespaceCharacters",prefix+"\nreturn true;");
for(const mode of ["coach","model","rewrite"]){
 let error="";
 assert.equal(submit("AI helps students check their writing.",{mainPoint:"",strongest:"",weakness:"",help:""},mode,{current:null},{current:0},x=>error=x,()=>{},s=>s.replace(/\s/g,"").length),true);
 assert.equal(error,"");
}
assert.equal(submit("",{}, "coach",{current:null},{current:0},()=>{},()=>{},s=>s.length),undefined);
assert.ok(!prefix.includes("assignmentBrief"),"Optional assignment must not gate submission");
assert.match(text,/const DEFAULT_GOAL = ""/);
assert.ok(!text.includes('value="" disabled>'),'Optional choices must be clearable');
console.log("Blank optional fields permit all support modes; empty draft remains blocked.");
