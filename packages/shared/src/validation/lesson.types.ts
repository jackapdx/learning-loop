// ── Content Types ──
// Extensible content type system for lessons.
// Each lesson declares its contentType in frontmatter.
// The prebuild script and app use this to select the correct renderer.

/**
 * Supported lesson content types.
 * - `learning-loop` — The standard 7-stage Learning Loop pedagogy (default)
 * - `overview` — Series overview/roadmap with lesson listing
 * - `deep-dive` — Long-form technical deep dive (no attempt/feedback cycle)
 * - `cheatsheet` — Quick reference card (tables, commands, patterns)
 * - `case-study` — Real-world production incident analysis
 * - `interactive-lab` — Hands-on lab with code exercises
 */
export type ContentType =
  | "learning-loop"
  | "overview"
  | "deep-dive"
  | "cheatsheet"
  | "case-study"
  | "interactive-lab";

/**
 * Section type — the Learning Loop stages plus extended types.
 * Standard stages are: orient, attempt, feedback, explain, extend, checkpoint, reflect.
 * Extended stages are: scenario, analysis, timeline, commands, patterns, exercise, solution, resources.
 */
export type SectionType =
  | "orient"
  | "attempt"
  | "feedback"
  | "explain"
  | "extend"
  | "checkpoint"
  | "reflect"
  // Extended types for alternative content types
  | "scenario"      // case-study: incident scenario description
  | "analysis"      // case-study: root cause analysis
  | "timeline"      // case-study: incident timeline
  | "commands"      // cheatsheet: command reference
  | "patterns"      // cheatsheet: pattern reference
  | "exercise"      // interactive-lab: hands-on exercise
  | "solution"      // interactive-lab: solution reveal
  | "resources";    // any type: external links and references

// ── Lesson data types ──

export interface LessonMeta {
  slug: string;
  number: number;
  title: string;
  titleEn: string;
  summary: string;
  emoji: string;
  duration: string;
  section?: string;
  contentType: ContentType;
  tags?: string[];
  prerequisites?: string[];
  next?: string[];
}

export interface AttemptOption {
  text: string;
  analysis: string;
  level: "correct" | "partial" | "incorrect";
}

export interface LessonSection {
  type: SectionType;
  title: string;
  content?: string;
  // Learning Loop specific
  attemptQuestion?: string;
  attemptOptions?: AttemptOption[];
  checkpointQuestion?: string;
  checkpointAnswer?: string;
  // Extended section metadata
  lang?: string;           // code language for commands/exercise sections
  difficulty?: "beginner" | "intermediate" | "advanced";
}

export interface Lesson {
  meta: LessonMeta;
  sections: LessonSection[];
}
