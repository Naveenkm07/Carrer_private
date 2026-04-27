# Mode: offer — Full A-G Evaluation

When the candidate pastes an offer (text or URL), ALWAYS deliver the 7 blocks (A-F evaluation + G legitimacy):

## Step 0 — Archetype Detection

Classify the offer into one of the backend archetypes (see `_shared.md`). If it's a hybrid, indicate the 2 closest ones. This determines:
- Which proof points to prioritize in block B
- How to rewrite the summary in block E
- Which STAR stories to prepare in block F

## Block A — Role Summary

Table with:
- Detected Archetype
- Domain (fintech/infrastructure/e-commerce/etc.)
- Function (build/scale/maintain/design)
- Seniority
- Remote (full/hybrid/onsite)
- Team size (if mentioned)
- TL;DR in 1 sentence

## Block B — CV Match

Read `cv.md`. Create a table with each JD requirement mapped to exact lines from the CV.

**Adapted to archetype:**
- If Backend Systems Engineer → prioritize scalability, performance, and distributed systems proof points.
- If API Platform Engineer → prioritize API design, developer experience, and integration proof points.
- If DevOps/Infrastructure Engineer → prioritize IaC, CI/CD, and cloud infrastructure proof points.

**Gaps** section with mitigation strategy for each. For each gap:
1. Is it a hard blocker or a nice-to-have?
2. Can the candidate demonstrate adjacent experience?
3. Is there a portfolio project that covers this gap?
4. Concrete mitigation plan (phrase for cover letter, quick project, etc.)

## Block C — Level and Strategy

1. **Detected level** in the JD vs **candidate's natural level for that archetype**
2. **"Sell senior without lying" plan**: specific phrases adapted to the archetype, concrete achievements to highlight, how to position founder experience as an advantage.
3. **"If they downlevel me" plan**: accept if compensation is fair, negotiate a 6-month review, clear promotion criteria.

## Block D — Comp and Demand

Use WebSearch for:
- Current salaries for the role (Glassdoor, Levels.fyi, Blind)
- Company's compensation reputation
- Role demand trend

Table with data and cited sources. If there's no data, say so instead of inventing it.

## Block E — Personalization Plan

| # | Section | Current state | Proposed change | Why |
|---|---------|---------------|-----------------|-----|
| 1 | Summary | ... | ... | ... |
| ... | ... | ... | ... | ... |

Top 5 changes to the CV + Top 5 changes to LinkedIn to maximize match.

## Block F — Interview Plan

6-10 STAR+R stories mapped to JD requirements (STAR + **Reflection**):

| # | JD Requirement | STAR+R Story | S | T | A | R | Reflection |
|---|----------------|--------------|---|---|---|---|------------|

The **Reflection** column captures what was learned or what would be done differently. This signals seniority — junior candidates describe what happened, senior candidates extract lessons.

**Story Bank:** If `interview-prep/story-bank.md` exists, check if any of these stories are already there. If not, append new ones.

**Selected and framed according to archetype:**
- Backend Systems Engineer → emphasize system design and optimization.
- API Platform Engineer → emphasize API consistency and DX.
- DevOps/Infrastructure Engineer → emphasize reliability and automation.

Also include:
- 1 recommended case study (which project to present and how)
- Red-flag questions and how to answer them

## Block G — Posting Legitimacy

Analyze the job posting for signals that indicate whether this is a real, active opening.

**Ethical framing:** Present observations, not accusations. Every signal has legitimate explanations. The user decides how to weigh them.

### Signals to analyze (in order):

**1. Posting Freshness**:
- Date posted or "X days ago"
- Apply button state (active / closed / missing)

**2. Description Quality**:
- Specific technologies, frameworks, tools?
- Team size, reporting structure, or org context?
- Realistic requirements?
- Clear scope for the first 6-12 months?
- Salary mentioned?

**3. Company Hiring Signals**:
- Search: `"{company}" layoffs {year}`
- Search: `"{company}" hiring freeze {year}`

**4. Reposting Detection**:
- Check if company + similar role title appeared before.

**5. Role Market Context**:
- Common role?
- Makes sense for the company?

### Output format:

**Assessment:** One of three tiers:
- **High Confidence**
- **Proceed with Caution**
- **Suspicious**

**Signals table:** Each signal observed with its finding and weight (Positive / Neutral / Concerning).

---

## Post-evaluation

**ALWAYS** after generating blocks A-G:

### 1. Save report .md

Save the full evaluation in `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`.

### 2. Register in tracker

**ALWAYS** register in `data/applications.md`:
- Sequential number
- Current date
- Company
- Role
- Score: match average (1-5)
- Status: `Evaluated`
- PDF: ❌
- Report: relative link to the report .md
