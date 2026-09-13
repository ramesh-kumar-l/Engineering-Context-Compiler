# Why AI Coding Agents Need Better Context, Not More Context

Point a coding agent at a real repository and give it a vague-but-realistic task —
"investigate the intermittent timeout in the payment service" — and watch what it does. Most
agents today have exactly one strategy available: search the repository with whatever
file-search/grep tool they have, read what turns up, and start reasoning. That strategy fails
in two directions, and neither failure is really about the model:

- **It reads too little.** The file that actually explains the bug might not contain any of
  the words in the task description. A grep for "timeout" won't find a commit message that
  says "reduced from 5000ms to 200ms to speed up checkout," and it definitely won't find a
  decision someone recorded three weeks ago about exactly this trade-off.
- **It reads too much.** Faced with ambiguity, the safer move is to read broadly — pull in
  every file that seems adjacent, every test, every recent commit. That burns context budget
  on material that turns out to be irrelevant, and it's not free: every irrelevant file is
  tokens not spent reasoning about the actual bug.

Neither of these is a capability gap in the model. A sufficiently large context window doesn't
fix "the agent doesn't know which evidence is authoritative," and better prompting doesn't fix
"the codebase has no way to tell the agent that this design was already discussed and already
went wrong once." These are **retrieval and judgment** problems, and they exist upstream of
whatever the agent actually does with the context it's given.

## The retrieval problem isn't new — the judgment problem is

Search — grep, an IDE's "find in files," even embedding-based retrieval — solves finding text
similar to a query. It does not solve:

- **Which source should I trust more?** A file that currently exists on disk is a stronger
  claim than a decade-old comment; a passing test is stronger evidence than an unverified
  assumption. Plain text search treats all matches the same.
- **What's already been tried or decided?** Code and even git history capture *what* changed;
  neither reliably captures *why*, or whether the change already caused an incident.
- **How risky is this, really?** A one-line typo fix and a refactor of untested payment logic
  are not the same kind of task, and an agent shouldn't get the same generic "looks fine, ship
  it" confidence for both.
- **What did I have to leave out, and does it matter?** A context window has a hard limit.
  Silently truncating retrieved evidence to fit is different from *deciding* what to exclude
  and saying so.

None of these are retrieval questions in the search sense. They're judgment questions that sit
*on top of* retrieval — which is exactly the gap the [Engineering Context
Compiler](../../README.md) (ECC) is built to fill. ECC doesn't replace an agent's ability to
search a repository; it produces a single, ranked, trust-labeled, budget-fitted package
*before* the agent starts, so the agent's first read is a curated brief instead of a blind
search. The architecture is covered in [the next post in this
series](02-building-an-engineering-context-compiler.md); the comparison with plain
retrieval/RAG is covered in [post
three](03-why-rag-alone-is-not-enough-for-software-engineering.md).

## A concrete instance

[Golden Example 1](../examples/golden-example-01-debugging/) walks through exactly this
scenario end to end, with real captured command output: an intermittent payment-gateway
timeout, where the causal explanation (a timeout that used to be 5000ms, deliberately cut to
200ms under load, already tied to a recorded incident) exists only in git history and a
recorded decision — not in the current source. A naive keyword-driven baseline never
surfaces the test file covering the affected code, at any token budget tested, and has no way
to know the timeout value changed at all. The measured numbers (not estimates) at a
150-token budget: the naive baseline gets 33% evidence recall and 0% provenance for 236
tokens; the compiled package gets 100% recall and 100% provenance for 149 tokens.

That gap — recall, provenance, and the causal "why" — is what "better context" means here. Not
a bigger window. Not more files stuffed into a prompt. A judgment layer that decides what
matters, labels how much to trust it, and says plainly what it left out.

## What this series covers

This is the first of five posts on the ideas behind ECC:

1. **Why AI coding agents need better context, not more context** (this post)
2. [Building an Engineering Context Compiler](02-building-an-engineering-context-compiler.md) — the actual pipeline, phase by phase
3. [Why RAG alone is not enough for software engineering](03-why-rag-alone-is-not-enough-for-software-engineering.md)
4. [Measuring AI engineering productivity: tokens are only the beginning](04-measuring-ai-engineering-productivity.md)
5. [From context engineering to engineering intelligence](05-from-context-engineering-to-engineering-intelligence.md)

Each post distinguishes what's actually implemented and measured today from what's a
reasonable future direction that hasn't been built or validated yet. None of the numbers cited
are estimates — they come from [`project-memory-bank/07-evaluation.md`](../../project-memory-bank/07-evaluation.md)
and the [golden examples](../examples/), both reproducible from the commands documented there.
