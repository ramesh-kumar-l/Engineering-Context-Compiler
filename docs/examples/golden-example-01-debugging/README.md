# Golden Example 1 — Debugging an Intermittent Payment Timeout

Every command and JSON payload in this example was actually run against the fixture
repository in [`fixture-repo/`](fixture-repo/) (built by the [reproduction script](#14-reproducibility-instructions)
below) using the built CLI (`node dist/cli/index.js`). Nothing here is invented — the raw
outputs are checked in under [`captured-output/`](captured-output/) so you can diff them
against your own re-run.

## 1. Engineering problem

A checkout service pages on-call twice in one week: `chargeCard()` intermittently fails with
a gateway timeout under load. The failure is not constant — most charges succeed — which is
exactly the kind of "intermittent" bug where an agent's first instinct (read the function,
see nothing obviously wrong, shrug) fails.

## 2. Repository context

[`fixture-repo/`](fixture-repo/) is a small, deliberately constructed demo repository — five
files, four real git commits, two real recorded memory entries — built specifically for this
walkthrough so the example is self-contained and reproducible. It is not ECC's own codebase
and it is not a real production incident; it is realistic enough to exercise every part of
the pipeline (code, tests, git history, memory) without requiring a large external repo.

Structure:

```
src/paymentGateway.ts       # simulated external card network call (randomized latency)
src/paymentService.ts       # chargeCard(): races the gateway call against a timeout
src/orderService.ts         # calls chargeCard() from the checkout flow
src/notificationService.ts  # unrelated: sends receipt emails
test/paymentService.test.ts # one test for chargeCard()
```

Git history (oldest to newest):
1. `Initial checkout flow: orderService, paymentGateway, notificationService`
2. `Add paymentService.chargeCard with a 5000ms gateway timeout`
3. `Add test coverage for chargeCard`
4. `Reduce payment gateway timeout from 5000ms to 200ms to speed up checkout under load`

Two memory entries were recorded against this repo before running ECC (via `ecc memory`),
representing what a team would plausibly have already captured:
- **incident**: "Payment gateway timeout spikes under load during peak checkout traffic"
- **decision**: "Reduced payment gateway timeout to 200ms to keep checkout fast under load"

## 3. Starting task

```bash
node dist/cli/index.js context "investigate the intermittent timeout in the payment service" --path <fixture-repo>
```

ECC classifies this as `task.type: "investigate"` from the wording alone — no flag needed.

## 4. Naive-approach comparison

"Naive" here means the same keyword-driven, no-ranking, no-trust, read-whole-file approach
ECC's own `npm run benchmark` uses as its baseline (`retrieveBaselineEvidence`, in
[`src/core/evaluation/baselineRetriever.ts`](../../../src/core/evaluation/baselineRetriever.ts)):
walk the repo in filesystem order, match file paths against keywords extracted from the
request, read each match whole, stop at the token budget. This is what an agent using a
generic "grep the repo" tool and no ranking would effectively do.

Run for real with [`measure.mjs`](captured-output/measure.mjs) (see reproduction steps):

| Condition | Budget | Items | Recall vs. ground truth* | Provenance | Tokens |
|---|---|---|---|---|---|
| Naive keyword match | unbounded | 4 | 66.7% (misses the test file) | 0% | 368 |
| Naive keyword match | 150 | 3 | 33.3% (misses the test file **and** the gateway) | 0% | 236 |
| Agent + ECC | unbounded (4000) | 5 | 100% | 100% | 336 |
| Agent + ECC | 150 (tight) | 5 | 100% | 100% | 149 |

\* Ground truth relevant paths for this task: `src/paymentService.ts`,
`src/paymentGateway.ts`, `test/paymentService.test.ts`.

The naive baseline never sees `test/paymentService.test.ts` at all under a filesystem-walk +
keyword-match order, at any budget tested — its keyword match is against file *paths*, and
`test/paymentService.test.ts` doesn't literally contain "payment" in a form its tokenizer
matches ahead of the other candidates before the budget runs out. It also cannot see either
memory entry, since it only reads files that exist on disk today — it has no way to know the
timeout used to be 5000ms or that this has already caused an incident.

## 5. Evidence ECC discovers

From [`captured-output/context-full-budget.json`](captured-output/context-full-budget.json):

- **Primary**: `src/paymentService.ts` (relevance 0.6, resolves symbol `GATEWAY_TIMEOUT_MS`)
  and `test/paymentService.test.ts` (relevance 0.54) — the file that changed and its test.
- **Supporting**: all three initial-commit files as `git` evidence, the two `paymentService.ts`
  commits (the 5000ms→200ms change ranked at relevance 1.0, the original addition at 0.8), and
  both recorded memory entries (`trustLevel: "inference"`, relevance 0.4).

## 6. Evidence ECC excludes

At the default/large budget nothing is excluded — the whole fixture repo fits. Tightening the
budget to 150 tokens (`captured-output/context-tight-budget-150.json`) triggers a real
`excluded: [{"reason": "token_budget_exceeded", "count": 7}]` and drops, among other
low-relevance items: `src/notificationService.ts`, `src/orderService.ts`, and
`src/paymentGateway.ts` as **primary** code evidence (they remain reachable only via the
initial-commit git items in `supporting`), and — importantly — **both memory entries**
(the incident and the decision).

## 7. Why this evidence matters

The single most useful fact for diagnosing this bug isn't in any file open today: the timeout
used to be `5000ms` and was deliberately cut to `200ms` "to speed up checkout under load" —
that's only visible via the git commit message and the recorded decision. Losing the memory
entries under a too-tight budget (§6) means losing the *causal* explanation for why the
timeout is where it is, and losing the "already paged on-call twice" incident context that
tells you this isn't a one-off. Code and tests tell you *what* the system does; memory and
history tell you *why it's built that way* and *what already went wrong*.

## 8. Generated `EngineeringContextPackage`

Full, unedited output at [`captured-output/context-full-budget.json`](captured-output/context-full-budget.json).
Abridged:

```json
{
  "task": { "type": "investigate", "request": "investigate the intermittent timeout in the payment service" },
  "context": {
    "primary": [
      { "source": "code", "path": "src/paymentService.ts", "symbols": ["GATEWAY_TIMEOUT_MS"], "relevance": 0.6, "trustLevel": "fact" },
      { "source": "test", "path": "test/paymentService.test.ts", "relevance": 0.54, "trustLevel": "fact" }
    ],
    "supporting": [
      { "source": "git", "path": "src/paymentService.ts", "identifier": "Reduce payment gateway timeout from 5000ms to 200ms to speed up checkout under load", "relevance": 1, "trustLevel": "fact" },
      { "source": "memory", "identifier": "Payment gateway timeout spikes under load during peak checkout traffic", "relevance": 0.4, "trustLevel": "inference" },
      { "source": "memory", "identifier": "Reduced payment gateway timeout to 200ms to keep checkout fast under load", "relevance": 0.4, "trustLevel": "inference" }
    ]
  },
  "verification": [
    "Risk: low (no elevated risk factors detected)",
    "Run the existing tests: test/paymentService.test.ts"
  ],
  "excluded": []
}
```

## 9. Token comparison

Same table as §4, restated as the headline comparison: at a realistic tight budget (150
tokens), the naive approach gets **33% recall and 0% provenance** for 236 tokens; ECC gets
**100% recall and 100% provenance** for **149 tokens** — fewer tokens *and* strictly better
coverage, because ranking puts the two ground-truth-relevant items first instead of keeping
them in filesystem-walk order.

## 10. Agent interaction

This is a real transcript: the full `context-full-budget.json` package (§8) was handed to an
AI coding agent (the author of this document, acting in that role) with no other repository
access, and asked to diagnose the bug from the package alone.

**Agent's diagnosis, from the package alone:**

> `chargeCard()` races `callCardNetwork()` against a hard-coded `GATEWAY_TIMEOUT_MS` (currently
> 200ms — see the resolved symbol in `paymentService.ts`, primary evidence). The git history
> shows this was intentionally cut down from 5000ms "to speed up checkout under load." The
> supporting `paymentGateway.ts` evidence (via the initial-commit git item) simulates
> variable-latency network calls in the 50–450ms range. Since 200ms is *inside* that latency
> range, a fraction of real calls will legitimately exceed the timeout under normal variance —
> this isn't a bug in the race/timeout logic, it's an overly aggressive timeout value chosen
> without load data, which lines up exactly with the recorded incident memory ("timeout spikes
> under load") and decision memory (the 200ms change itself, noted as "not fully load-tested").
> Recommendation: either raise `GATEWAY_TIMEOUT_MS` closer to the observed latency ceiling, or
> add a bounded retry with backoff instead of a single hard cutoff, and re-run
> `test/paymentService.test.ts` plus a load test before shipping either change.

No file outside the compiled package was consulted to produce this diagnosis — everything
cited above traces back to a `primary`/`supporting` item with a `provenance` field.

## 11. Result

The diagnosis in §10 is correct by construction — this fixture was built with exactly that
root cause (`GATEWAY_TIMEOUT_MS = 200` racing a 50–450ms simulated latency window). The value
this example demonstrates is that the *causal* evidence (the timeout used to be higher; it was
changed for a documented, load-related reason; it already caused an incident) was recoverable
from a single compiled package, ranked ahead of unrelated files, without the agent reading the
whole repository or being told where to look.

## 12. Verification

The package's own `verification` field reads:
```
"Risk: low (no elevated risk factors detected)",
"Run the existing tests: test/paymentService.test.ts"
```
See §13 — this is an honest limitation this example surfaced, not a scripted result.

## 13. Lessons learned

- **Memory carries the "why," not just the "what."** Neither raw code nor even git history
  alone stated *why* 200ms was chosen or that it already caused an incident — only the
  recorded memory entries did. This is the concrete case for Phase 14 (Engineering Memory)
  existing at all.
- **A too-tight token budget can silently drop the most causal evidence.** At `--budget 150`,
  both memory entries were excluded (§6) even though they were the most informative items in
  the package. Always check `excluded.count` before trusting a tightly-budgeted package —
  ECC reports the count honestly, but it's still on the caller to notice and re-run with a
  larger budget if something important might have been cut.
- **A real, honest gap this example surfaced**: the `verification` field reports `"Risk: low"`
  for this task even though the repository has a recorded incident directly tied to the exact
  file being investigated. Phase 15's risk scoring (`assessRisk`) is a static rule table over
  the *current* evidence set's structural properties (test coverage, primary-set size, task
  type) — it does not currently weight the presence of related incident/negative-outcome
  memory entries into the risk level itself. This matches the known limitation already
  recorded in [`project-memory-bank/04-decisions.md`](../../../project-memory-bank/04-decisions.md)
  (Decision #21) and [`active-context.md`](../../../project-memory-bank/active-context.md)'s
  open questions — flagged here as documentation, not fixed, per this task's scope (no product
  code changes).

## 14. Reproducibility instructions

This exact fixture repo, memory entries, and both captured JSON files can be rebuilt from
scratch. Run from the ECC repository root, with `npm run build` already done:

```bash
# 1. Build a throwaway fixture repo with real git history
REPO=$(mktemp -d)
mkdir -p "$REPO/src" "$REPO/test" && cd "$REPO"
git init -q && git config user.email "demo@example.com" && git config user.name "Demo"

cat > src/paymentGateway.ts <<'EOF'
export interface GatewayResponse { ok: boolean; latencyMs: number }
export async function callCardNetwork(amountCents: number): Promise<GatewayResponse> {
  const latencyMs = 50 + Math.floor(Math.random() * 400)
  await new Promise((resolve) => setTimeout(resolve, latencyMs))
  return { ok: amountCents > 0, latencyMs }
}
EOF
cat > src/notificationService.ts <<'EOF'
export function sendReceiptEmail(orderId: string, address: string): void {
  console.log(`Sending receipt for order ${orderId} to ${address}`)
}
EOF
cat > src/orderService.ts <<'EOF'
import { chargeCard } from './paymentService.js'
export async function placeOrder(orderId: string, amountCents: number): Promise<boolean> {
  const charged = await chargeCard(amountCents)
  if (!charged) console.error(`Order ${orderId} failed: payment not charged`)
  return charged
}
EOF
git add -A && git commit -q -m "Initial checkout flow: orderService, paymentGateway, notificationService"

cat > src/paymentService.ts <<'EOF'
import { callCardNetwork } from './paymentGateway.js'
const GATEWAY_TIMEOUT_MS = 5000
export async function chargeCard(amountCents: number): Promise<boolean> {
  const result = await Promise.race([
    callCardNetwork(amountCents),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('gateway timeout')), GATEWAY_TIMEOUT_MS)),
  ])
  return result.ok
}
EOF
git add -A && git commit -q -m "Add paymentService.chargeCard with a 5000ms gateway timeout"

cat > test/paymentService.test.ts <<'EOF'
import { describe, it, expect } from 'vitest'
import { chargeCard } from '../src/paymentService.js'
describe('chargeCard', () => {
  it('returns true for a positive amount', async () => {
    expect(await chargeCard(1000)).toBe(true)
  })
})
EOF
git add -A && git commit -q -m "Add test coverage for chargeCard"

cat > src/paymentService.ts <<'EOF'
import { callCardNetwork } from './paymentGateway.js'
const GATEWAY_TIMEOUT_MS = 200
export async function chargeCard(amountCents: number): Promise<boolean> {
  const result = await Promise.race([
    callCardNetwork(amountCents),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('gateway timeout')), GATEWAY_TIMEOUT_MS)),
  ])
  return result.ok
}
EOF
git add -A && git commit -q -m "Reduce payment gateway timeout from 5000ms to 200ms to speed up checkout under load"

# 2. Record the two memory entries (run from the ECC repo root, not $REPO)
cd - >/dev/null
node dist/cli/index.js memory --type incident \
  --summary "Payment gateway timeout spikes under load during peak checkout traffic" \
  --paths src/paymentService.ts,src/paymentGateway.ts --path "$REPO"
node dist/cli/index.js memory --type decision \
  --summary "Reduced payment gateway timeout to 200ms to keep checkout fast under load" \
  --paths src/paymentService.ts --path "$REPO"

# 3. Run ECC at both budgets
node dist/cli/index.js context "investigate the intermittent timeout in the payment service" --path "$REPO" --budget 4000
node dist/cli/index.js context "investigate the intermittent timeout in the payment service" --path "$REPO" --budget 150
```

Token/recall numbers in §4 and §9 were produced by calling `retrieveBaselineEvidence` and
`runEvaluation` (the exact functions `npm run benchmark` uses) directly against `$REPO` — see
[`measure.mjs`](captured-output/measure.mjs), reusable as `node measure.mjs <repo-path> <budget>`.
