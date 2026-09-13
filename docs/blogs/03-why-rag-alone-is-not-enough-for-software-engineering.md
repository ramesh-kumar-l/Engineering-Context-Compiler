# Why RAG Alone Is Not Enough for Software Engineering

It's a fair question: if the goal is finding the right evidence for a coding task, why not
just use retrieval-augmented generation — embed the codebase, embed the query, retrieve the
nearest neighbors? Embeddings would fix a real, documented weakness in the [Engineering
Context Compiler](../../README.md) (ECC) as it exists today: its retrievers match on
**exact keyword overlap** between the request and file paths/symbol names, not semantic
similarity. That's a real gap, not a strawman — [Golden Example
2](../examples/golden-example-02-refactoring/) demonstrates it directly: phrasing a refactor
request as "duplicated user **validation** logic" retrieves *zero* of the two actually-relevant
files, because their names tokenize to "validat**or**," not "validat**ion**" — an exact-string
miss a semantic retriever would not make.

So embeddings would help. The claim in this post is narrower and more specific: **retrieval
quality, however good, is a different problem from the judgment problem this pipeline exists
to solve** — and a better retriever doesn't produce trust levels, provenance, conflict
detection, or a risk-scaled verification plan just by being a better retriever.

## What RAG actually gives you

RAG's job is: given a query, return the most textually/semantically similar chunks from a
corpus. That's genuinely useful and genuinely hard to do well at scale. But similarity is not
the only thing that matters when the corpus is a codebase and the consumer is about to change
production behavior:

- **Similarity isn't authority.** A five-year-old comment that's semantically close to the
  query and a currently-passing test that's semantically close to the query are not equally
  trustworthy just because they scored similarly. ECC's ranking stage applies a separate
  per-source-type authority weight *on top of* relevance for exactly this reason (Decision #11
  in [`04-decisions.md`](../../project-memory-bank/04-decisions.md)) — code and tests are
  weighted differently from git history, which is weighted differently from memory entries
  recorded as `inference`-level trust, regardless of how similar any of them scored.
- **Similarity isn't provenance.** A RAG pipeline can tell you *what* it retrieved; it
  doesn't inherently tell a consumer whether a claim is a directly observed fact, something
  derived from facts, or an unconfirmed inference — and conflating those is exactly what
  causes an agent to act on a guess with the same confidence as a verified fact. ECC's schema
  makes provenance and a `fact`/`derived`/`inference`/`unknown` trust level structurally
  required on every item — a compiled package cannot pass schema validation without them
  (Decision #13).
- **Similarity doesn't detect disagreement.** If two pieces of evidence about the same file
  carry different trust levels, that's a signal worth surfacing, not silently picking whichever
  scored higher. ECC's `conflicts` field exists specifically so this isn't resolved for the
  consumer without their knowledge.
- **Similarity doesn't scale a verification plan to risk.** Whether a change needs "run the
  existing tests" or "add test coverage, get a peer review, this is high risk" depends on task
  type, existing coverage, and blast radius — none of which a retriever's job is to compute.
- **Similarity doesn't know what it left out.** A context window still has a hard limit no
  matter how good retrieval is. ECC's compilation stage tracks exclusions explicitly
  (`excluded: [{reason, count}]`) rather than letting a truncation happen invisibly.

None of this is an argument against embeddings — it's an argument that embeddings answer "what
looks similar," and this list is entirely about "what should I trust, and what's the risk."
Those are different questions with different mechanisms.

## The honest version of this argument

To be precise about where the current implementation actually stands: ECC's retrievers today
are keyword/AST-based, not embedding-based, and that's a real limitation, not a design flaw
being spun as a feature (see Decision #9). The point of this post isn't "ECC's retrieval is
already better than RAG" — on raw recall, it demonstrably isn't always even better than a
*naive* keyword baseline, as Golden Example 2 shows honestly (a tie, not a win, on that
specific metric). The point is that **ranking, trust, provenance, conflict detection, and
risk-scaled verification are a separate layer from retrieval, and nothing about improving
retrieval — swapping in embeddings, upgrading to a smarter search — builds that layer for
free.** [`00-vision.md`](../../project-memory-bank/00-vision.md) states this directly: ECC is
designed to sit *on top of* embedding-based retrieval later, not to replace or compete with it.
Nothing in the current architecture precludes plugging a semantic retriever in as a fifth
evidence source alongside code/test/git/memory — it just hasn't been built, because the
sixteen phases so far were scoped to prove the ranking/trust/verification/memory layer works
at all, with the simplest retrievers that could feed it real signal.

## Measured, not asserted

The [evaluation methodology](../../project-memory-bank/07-evaluation.md) compares a naive
keyword-grep baseline against the full pipeline on this repository's own codebase, not a
cherry-picked demo: evidence recall improved from 67% to 100%, provenance completeness from 0%
to 100%, and estimated tokens dropped from 2833 to 1053 across the three benchmark tasks
measured. The one metric that came out *unfavorable* to ECC — irrelevant-evidence rate — is
reported as-is in that same document, because the point of measuring is measuring honestly,
not producing a comparison that flatters the tool on every axis (Decision #17).

Next: [measuring what actually changed for an agent working with this
context](04-measuring-ai-engineering-productivity.md) — and why token count is the least
interesting number in that comparison.
