# Golden Example 2 — Scoping a Refactor of Duplicated Validation Logic

Every command and JSON payload below was actually run against the fixture repository in
[`fixture-repo/`](fixture-repo/) using the built CLI. Raw outputs are checked in under
[`captured-output/`](captured-output/). Unlike Example 1, this one is deliberately **not** a
clean recall win for ECC — the naive baseline ties it on recall here, and that's reported
honestly (§4, §9) because the real differentiator this task demonstrates is provenance, memory,
and risk-scaled verification, not retrieval recall alone.

## 1. Engineering problem

Two nearly-identical validation functions exist — one for signup, one for profile updates —
because the second was copy-pasted from the first under deadline pressure. Someone now wants
to extract the shared logic into one module before adding a third caller. Before touching
either file, they want to know: what else references this code, has this duplication been
discussed before, and how risky is this change?

## 2. Repository context

[`fixture-repo/`](fixture-repo/) — three files, three commits, one recorded memory entry, all
purpose-built for this walkthrough:

```
src/userRepository.ts          # unrelated: user lookup, included as noise
src/signupValidator.ts         # validateSignup(email, password)
src/profileUpdateValidator.ts  # validateProfileUpdate(email, password) - near-duplicate
```

Git history:
1. `Initial user repository`
2. `Add signup form with inline email/password validation`
3. `Add profile update form, copied validation from signup under deadline pressure`

One memory entry was recorded beforehand: a **decision** — "Duplicated signup validation into
profile update instead of extracting a shared module," with detail noting it was a known,
deadline-driven tech-debt trade-off.

Deliberately, **no test file exists** for either validator — this is what makes the
verification plan in §12 interesting.

## 3. Starting task

```bash
node dist/cli/index.js context "refactor the duplicated signup and profile update validators into a shared validator module" --path <fixture-repo>
```

ECC classifies this as `task.type: "modify"` (not `"refactor"`, despite the word appearing in
the request — see §13 for why that's worth noting, not glossing over).

## 4. Naive-approach comparison

Using the same baseline methodology as Example 1 (`retrieveBaselineEvidence`, filesystem-walk
+ path-keyword matching, no ranking/trust/provenance):

| Condition | Items (unique paths) | Recall vs. ground truth* | Irrelevant rate | Provenance | Tokens |
|---|---|---|---|---|---|
| Naive keyword match | 2 | 100% | 0% | 0% | 140 |
| Agent + ECC | 2 | 100% | 0% | 100% | 151 |

\* Ground truth: `src/signupValidator.ts`, `src/profileUpdateValidator.ts`.

**Honest result**: on raw file recall, the two are tied — both files contain "validator" in
their path, which a plain keyword-in-path match finds just as easily as ECC's code retriever
does. This is a real case where naive retrieval isn't wrong. The difference is in what each
approach hands back beyond the two file paths — see §5–§7 and §12.

## 5. Evidence ECC discovers

From [`captured-output/context-full-budget.json`](captured-output/context-full-budget.json):

- **Primary**: `src/profileUpdateValidator.ts` (relevance 0.3, symbol `validateProfileUpdate`)
  and `src/signupValidator.ts` (relevance 0.2, symbol `validateSignup`) — both correctly
  identified, `trustLevel: "fact"`.
- **Supporting**: the git commit that introduced each file — critically, the commit message
  for `profileUpdateValidator.ts` is *"copied validation from signup under deadline
  pressure"*, which states the duplication explicitly — plus the recorded decision memory
  entry (relevance 0.7, `trustLevel: "inference"`) confirming this was a known, discussed
  trade-off, not an accident nobody noticed.

## 6. Evidence ECC excludes

Nothing — `excluded: []`. The fixture is small enough that everything fits even at this
budget. (Example 1 already demonstrates real, non-empty exclusion under a tight budget; this
example's point is different — see §4/§12.)

## 7. Why this evidence matters

The naive baseline hands back two file paths and nothing else. ECC hands back the same two
files **plus** the specific git commit message that already documents *why* they're
duplicated, **plus** a recorded decision confirming a human already made this trade-off
deliberately (so this isn't "clean up an accident," it's "pay down an acknowledged debt") —
context that changes how a reviewer should read the eventual PR.

## 8. Generated `EngineeringContextPackage`

Full, unedited output at
[`captured-output/context-full-budget.json`](captured-output/context-full-budget.json).
Abridged:

```json
{
  "task": { "type": "modify", "request": "refactor the duplicated signup and profile update validators into a shared validator module" },
  "context": {
    "primary": [
      { "source": "code", "path": "src/profileUpdateValidator.ts", "symbols": ["validateProfileUpdate"], "relevance": 0.3, "trustLevel": "fact" },
      { "source": "code", "path": "src/signupValidator.ts", "symbols": ["validateSignup"], "relevance": 0.2, "trustLevel": "fact" }
    ],
    "supporting": [
      { "source": "git", "path": "src/profileUpdateValidator.ts", "identifier": "Add profile update form, copied validation from signup under deadline pressure", "relevance": 1, "trustLevel": "fact" },
      { "source": "git", "path": "src/signupValidator.ts", "identifier": "Add signup form with inline email/password validation", "relevance": 1, "trustLevel": "fact" },
      { "source": "memory", "identifier": "Duplicated signup validation into profile update instead of extracting a shared module", "relevance": 0.7, "trustLevel": "inference" }
    ]
  },
  "verification": [
    "Risk: high (task type 'modify' inherently carries elevated risk; no test evidence found for the affected code)",
    "No existing tests found for the affected code - add test coverage before merging",
    "Manually verify the primary evidence above reflects the intended change",
    "Request a peer review before merging"
  ],
  "excluded": []
}
```

## 9. Token comparison

Restated from §4: 140 tokens (naive, 0% provenance) vs. 151 tokens (ECC, 100% provenance) —
roughly the same token cost for the two file paths, but only one of the two answers carries
provenance, a trust level, historical "why," recorded decision context, and a risk-scaled
verification plan. Token parity here is itself an honest data point: ECC's value in this
example isn't "fewer tokens," it's "much more judgment per token."

## 10. Agent interaction

The full package (§8) was handed to an AI coding agent (the author of this document, acting
in that role) with no other repository access:

> Both `validateSignup` and `validateProfileUpdate` implement near-identical email/password
> checks (`email.includes('@')`, `password.length < 8`) — confirmed by reading the primary
> evidence directly, not inferred. The `profileUpdateValidator.ts` git commit message and the
> recorded decision memory both independently confirm this was intentional copy-paste under
> deadline pressure, not an oversight, so the refactor should preserve both functions'
> existing signatures/behavior exactly (including `profileUpdateValidator`'s slightly
> different empty-password handling — it only checks length `if (password)` is truthy, signup
> doesn't guard that) rather than silently unifying behavior that might currently differ on
> purpose. Given the risk plan (§12) flags **no test coverage for either file**, the
> recommended order is: write characterization tests for both functions' current behavior
> first, extract the shared logic second, then re-run those tests to confirm behavior didn't
> change, before requesting the peer review the risk plan also calls for.

The subtle behavioral difference the agent caught (`if (password)` truthy-check only in the
profile-update variant) is real — visible in the primary evidence's own source, not invented
for this transcript.

## 11. Result

This example produced a correct, actionable refactor plan: preserve both functions' exact
current behavior (including their one real difference) behind characterization tests before
extracting shared logic, and get peer review before merging — directly following the
package's own risk-scaled verification plan.

## 12. Verification

```
"Risk: high (task type 'modify' inherently carries elevated risk; no test evidence found for the affected code)",
"No existing tests found for the affected code - add test coverage before merging",
"Manually verify the primary evidence above reflects the intended change",
"Request a peer review before merging"
```

This is the real payoff this example demonstrates over Example 1's low-risk result: the same
`assessRisk` rule table (`src/core/verification/riskAssessor.ts`) scales its output to
context — a `modify`/`refactor`-type task touching code with **zero** test evidence
automatically crosses the "high" threshold (task-type weight 3 + no-test-coverage weight 2 =
5, at or above `HIGH_SCORE_FLOOR`), and the plan responds with concrete next steps (add tests,
get review) instead of the same generic advice Example 1's low-risk case got.

## 13. Lessons learned

- **Recall parity doesn't mean parity of value.** §4/§9 show naive retrieval tying ECC on
  file recall for this task — worth stating plainly rather than picking a task where ECC wins
  on every metric. The actual gap is provenance, historical context, and risk-scaled
  verification, none of which a bare file list carries.
- **Task classification is sensitive to exact wording, and that's worth knowing.** The
  original phrasing ("refactor the duplicated user validation logic into a shared module")
  classified as `refactor` but matched **zero** of the two actually-relevant files, because
  `codeEvidenceRetriever.ts` matches request keywords against file path/symbol tokens
  *exactly* ("validation" ≠ the token "validator" produced from `signupValidator.ts`) — a
  real instance of the documented "keyword-overlap, not semantic" limitation. Rewording to
  "validators" (§3) fixed retrieval but also changed the classified `task.type` from
  `refactor` to `modify`. Both are real, reproducible behaviors of the current implementation,
  not a scripted result — see the reproduction steps below to confirm either wording
  yourself. This is exactly the kind of implementation nuance this task's instructions say to
  document rather than silently fix.
- **A static risk table can still produce genuinely useful output.** No learned model was
  involved in flagging this change as high-risk — just task-type weight + "no test coverage
  found," both signals earlier phases already computed.

## 14. Reproducibility instructions

```bash
REPO=$(mktemp -d)
mkdir -p "$REPO/src" && cd "$REPO"
git init -q && git config user.email "demo@example.com" && git config user.name "Demo"

cat > src/userRepository.ts <<'EOF'
export interface User { id: string; email: string }
export function findUserById(id: string): User | null {
  return { id, email: `${id}@example.com` }
}
EOF
git add -A && git commit -q -m "Initial user repository"

cat > src/signupValidator.ts <<'EOF'
export function validateSignup(email: string, password: string): string[] {
  const errors: string[] = []
  if (!email.includes('@')) errors.push('email must contain @')
  if (password.length < 8) errors.push('password must be at least 8 characters')
  return errors
}
EOF
git add -A && git commit -q -m "Add signup form with inline email/password validation"

cat > src/profileUpdateValidator.ts <<'EOF'
export function validateProfileUpdate(email: string, password: string): string[] {
  const errors: string[] = []
  if (!email.includes('@')) errors.push('email must contain @')
  if (password && password.length < 8) errors.push('password must be at least 8 characters')
  return errors
}
EOF
git add -A && git commit -q -m "Add profile update form, copied validation from signup under deadline pressure"

# Run from the ECC repo root, not $REPO
cd - >/dev/null
node dist/cli/index.js memory --type decision \
  --summary "Duplicated signup validation into profile update instead of extracting a shared module" \
  --paths src/signupValidator.ts,src/profileUpdateValidator.ts --path "$REPO"

node dist/cli/index.js context "refactor the duplicated signup and profile update validators into a shared validator module" --path "$REPO"

# Compare against the original (retrieval-missing) wording:
node dist/cli/index.js context "refactor the duplicated user validation logic into a shared module" --path "$REPO"
```

Token/recall numbers in §4/§9 come from
[`measure.mjs`](captured-output/measure.mjs): `node measure.mjs <repo-path> <budget>`.
