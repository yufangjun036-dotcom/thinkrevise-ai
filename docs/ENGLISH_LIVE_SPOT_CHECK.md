# English Live-AI Spot-Check

Complete these three cases once with live AI before publishing the English edition. This is a focused acceptance check, not a repeat of the full benchmark suite.

## How to record the result

For each case, record:

- whether every required language issue was found;
- whether any correct wording was falsely marked as an error;
- whether the academic issue was classified appropriately;
- whether all learner-facing feedback was in clear English.

## Case 1 — Multiple language errors in one draft

Paste this draft into **Diagnose My Draft**:

> Many student use AI tool for university assignment. Last week, I ask an AI chatbot write two paragraph for my presentation, and it give me several useful idea. However, the information not match our course requirement. My tutor said students need check AI answer carefully before submit their work.

Required language issues:

1. `Many student` → `Many students`
2. `AI tool` → `AI tools` or `an AI tool`, according to the chosen meaning
3. `university assignment` → `university assignments` or `a university assignment`
4. `I ask` → `I asked`
5. `ask an AI chatbot write` → `ask an AI chatbot to write`
6. `two paragraph` → `two paragraphs`
7. `it give` → `it gave`
8. `several useful idea` → `several useful ideas`
9. `information not match` → `information did not match`
10. `course requirement` → `course requirements` or `the course requirement`, according to meaning
11. `need check` → `need to check`
12. `AI answer` → `AI answers`
13. `before submit` → `before submitting`

Pass condition: all 13 underlying corrections are communicated, even if the interface groups several corrections into one feedback card. No serious academic issue should be reported.

## Case 2 — Correct draft / false-alarm check

Paste this draft into **Diagnose My Draft**:

> AI can support university writing when learners use it carefully. I recently used an AI tool to brainstorm an outline for a reflective assignment. The suggestions helped me consider several perspectives, but I checked every factual claim and rewrote the final response in my own words. My tutor then evaluated the argument against our course criteria. This process saved time without replacing independent judgement. In my view, AI feedback is most useful as a starting point rather than a final answer.

Pass condition: no language error and no severe academic issue should be reported. A clearly labelled optional stylistic suggestion is acceptable only if it does not present correct wording as erroneous.

## Case 3 — Unverifiable evidence and overgeneralization

Paste this draft into **Diagnose My Draft**:

> A famous 2025 study found that AI tutoring raises university pass rates by 60 percent. The study reportedly tested 4,000 students, but I cannot locate the original paper, its authors or the research method. I used an AI tutor for one month and my quiz score improved. Therefore, every university should immediately replace most lectures with this AI system because it is proven to work for all students.

Pass condition: the system should flag the unverifiable statistical claim and the unsupported universal policy conclusion as academic/evidence concerns. It should not invent a source or label the passage as confirmed misconduct. There are no intentional grammar errors in this draft.

## Release decision

The live spot-check passes when:

- Case 1 communicates every required correction;
- Case 2 produces no false language error or severe academic allegation;
- Case 3 identifies the evidence problem and overgeneralization without inventing facts;
- all three results are presented in English.

If a case fails, save the complete output and correct only the affected detection or English-display behaviour before rerunning that case.
