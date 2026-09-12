import type { TaskType } from '../types/task.js'
import type { TaskSignal } from './types.js'

/**
 * Keyword/phrase signals per TaskType, applied to a lowercased request.
 * Multi-word phrases (weight 2) are specific enough to rarely appear in a
 * different task's request; single generic verbs (weight 1) are common and
 * can appear across types, so a weighted sum - not a raw count - decides
 * the winner (see taskClassifier.ts).
 */
export const TASK_SIGNALS: Record<TaskType, TaskSignal[]> = {
  explain: [
    { pattern: /\bwalk me through\b/, weight: 2 },
    { pattern: /\bcan you describe\b/, weight: 2 },
    { pattern: /\bwhat does\b/, weight: 2 },
    { pattern: /\bwhat is\b/, weight: 2 },
    { pattern: /\bhow does\b/, weight: 2 },
    { pattern: /\bhelp me understand\b/, weight: 2 },
    { pattern: /\bexplain\b/, weight: 1 },
    { pattern: /\bunderstand\b/, weight: 1 },
    { pattern: /\bsummarize\b/, weight: 1 },
    { pattern: /\bclarify\b/, weight: 1 },
  ],

  debug: [
    { pattern: /\bstack trace\b/, weight: 2 },
    { pattern: /\bnot working\b/, weight: 2 },
    { pattern: /\bthrows? an? error\b/, weight: 2 },
    { pattern: /\bbugs?\b/, weight: 1 },
    { pattern: /\bfix(es|ed|ing)?\b/, weight: 1 },
    { pattern: /\berrors?\b/, weight: 1 },
    { pattern: /\bcrash(es|ing|ed)?\b/, weight: 1 },
    { pattern: /\bfailing\b/, weight: 1 },
    { pattern: /\bfails\b/, weight: 1 },
    { pattern: /\bbroken\b/, weight: 1 },
    { pattern: /\bexceptions?\b/, weight: 1 },
    { pattern: /\bthrown\b/, weight: 1 },
  ],

  modify: [
    { pattern: /\bsupport for\b/, weight: 2 },
    { pattern: /\bnew feature\b/, weight: 2 },
    { pattern: /\badd (a|an|support|the)\b/, weight: 2 },
    { pattern: /\badd\b/, weight: 1 },
    { pattern: /\bimplement\b/, weight: 1 },
    { pattern: /\bcreate a\b/, weight: 1 },
    { pattern: /\bbuild a\b/, weight: 1 },
    { pattern: /\bupdate\b/, weight: 1 },
    { pattern: /\bchange\b/, weight: 1 },
    { pattern: /\bintroduce\b/, weight: 1 },
    { pattern: /\bextend\b/, weight: 1 },
  ],

  review: [
    { pattern: /\bcode review\b/, weight: 2 },
    { pattern: /\bgive feedback\b/, weight: 2 },
    { pattern: /\bfeedback on\b/, weight: 2 },
    { pattern: /\blook over\b/, weight: 2 },
    { pattern: /\btake a look at\b/, weight: 2 },
    { pattern: /\bsanity check\b/, weight: 2 },
    { pattern: /\bcheck my\b/, weight: 2 },
    { pattern: /\breview\b/, weight: 1 },
  ],

  refactor: [
    { pattern: /\bclean up\b/, weight: 2 },
    { pattern: /\btech debt\b/, weight: 2 },
    { pattern: /\bde-?duplicate\b/, weight: 2 },
    { pattern: /\brefactor\b/, weight: 1 },
    { pattern: /\brestructure\b/, weight: 1 },
    { pattern: /\bsimplify\b/, weight: 1 },
    { pattern: /\breorganize\b/, weight: 1 },
    { pattern: /\bextract\b/, weight: 1 },
  ],

  investigate: [
    { pattern: /\bfigure out why\b/, weight: 2 },
    { pattern: /\bfind out why\b/, weight: 2 },
    { pattern: /\blook into\b/, weight: 2 },
    { pattern: /\bdig into\b/, weight: 2 },
    { pattern: /\broot cause\b/, weight: 2 },
    { pattern: /\bwhy is\b/, weight: 2 },
    { pattern: /\bwhy does\b/, weight: 2 },
    { pattern: /\bwhat'?s causing\b/, weight: 2 },
    { pattern: /\binvestigate\b/, weight: 1 },
  ],

  plan: [
    { pattern: /\bhow should we\b/, weight: 2 },
    { pattern: /\barchitecture for\b/, weight: 2 },
    { pattern: /\bdesign doc\b/, weight: 2 },
    { pattern: /\bbest way to\b/, weight: 2 },
    { pattern: /\bplan\b/, weight: 1 },
    { pattern: /\bdesign\b/, weight: 1 },
    { pattern: /\bpropose\b/, weight: 1 },
    { pattern: /\broadmap\b/, weight: 1 },
    { pattern: /\bapproach for\b/, weight: 1 },
  ],

  test: [
    // Weight 3: these compound technical terms are unambiguous even next to
    // a generic verb from another type (e.g. "add an integration test" also
    // matches modify's "add a/an/the" starter at weight 2 - test must win).
    { pattern: /\bunit tests?\b/, weight: 3 },
    { pattern: /\bwrite tests?\b/, weight: 3 },
    { pattern: /\badd tests?\b/, weight: 3 },
    { pattern: /\bintegration tests?\b/, weight: 3 },
    { pattern: /\btest cases?\b/, weight: 3 },
    { pattern: /\btest coverage\b/, weight: 3 },
    { pattern: /\be2e\b/, weight: 1 },
    { pattern: /\btest\b/, weight: 1 },
    { pattern: /\bcoverage\b/, weight: 1 },
  ],

  optimize: [
    { pattern: /\bspeed up\b/, weight: 2 },
    { pattern: /\breduce latency\b/, weight: 2 },
    { pattern: /\bimprove performance\b/, weight: 2 },
    { pattern: /\boptimi[sz]e\b/, weight: 1 },
    { pattern: /\bperformance\b/, weight: 1 },
    { pattern: /\bfaster\b/, weight: 1 },
    { pattern: /\bbottleneck\b/, weight: 1 },
    { pattern: /\bslow\b/, weight: 1 },
    { pattern: /\blatency\b/, weight: 1 },
  ],
}

export const DEFAULT_TASK_TYPE: TaskType = 'explain'
