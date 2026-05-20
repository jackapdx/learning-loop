/**
 * Client-side lesson data API — replaces tRPC server calls.
 * All data is statically pre-rendered at build time by scripts/prebuild-lessons.ts.
 */
import { overviewData, lessonsMap } from "./lessons-data";
import type { Lesson, LessonMeta } from "shared";

export interface OverviewResult {
  overview: { title: string; subtitle: string; description: string; totalLessons: number };
  sections: { section: string; label: string; lessons: LessonMeta[] }[];
}

/** List all lessons grouped by section */
export function listLessons(): OverviewResult {
  return overviewData;
}

/** Get a single lesson (with checkpoint answers stripped — revealed separately) */
export function getLesson(slug: string): Lesson | null {
  const lesson = lessonsMap[slug];
  if (!lesson) return null;

  // Strip checkpoint/solution answers (revealed via revealAnswer)
  const safeSections = lesson.sections.map((s) => {
    if (s.type === "checkpoint" || s.type === "solution") {
      const { checkpointAnswer, ...rest } = s;
      return { ...rest, checkpointAnswer: undefined as string | undefined };
    }
    return s;
  });

  return { ...lesson, sections: safeSections };
}

/** Reveal a checkpoint answer (client-side — answer is already in the data) */
export function revealAnswer(slug: string, _sectionIndex: number): string | null {
  const lesson = lessonsMap[slug];
  if (!lesson) return null;

  // Find the checkpoint section
  const cpSection = lesson.sections.find((s) => s.type === "checkpoint");
  return cpSection?.checkpointAnswer ?? null;
}

// ── Quiz ──

export interface QuizOption {
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  lessonSlug: string;
  lessonTitle: string;
  lessonEmoji: string;
  question: string;
  options: QuizOption[];
}

/**
 * Fisher-Yates shuffle — O(n), uniformly random.
 * Mutates the array in place and returns it.
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Build a multiple-choice quiz from completed lessons. Returns up to `count` questions. */
export function buildQuiz(completedSlugs: string[], count = 5): QuizQuestion[] {
  if (completedSlugs.length === 0) return [];

  const questions: QuizQuestion[] = [];
  const pool = shuffle([...completedSlugs]);

  for (const slug of pool) {
    if (questions.length >= count) break;
    const q = extractQuizQuestion(slug);
    if (q) questions.push(q);
  }

  return questions;
}

function extractQuizQuestion(slug: string): QuizQuestion | null {
  const lesson = lessonsMap[slug];
  if (!lesson) return null;

  // Prefer attempt sections (multiple-choice ready)
  const attemptSection = lesson.sections.find((s) => s.type === "attempt");
  if (attemptSection?.attemptQuestion && attemptSection.attemptOptions && attemptSection.attemptOptions.length >= 2) {
    const options: QuizOption[] = attemptSection.attemptOptions.map((o) => ({
      text: o.text,
      correct: o.level === "correct",
    }));

    // Build full question from content HTML (includes scenario context),
    // stripping the stop-prompt and trailing separator
    let fullQuestion = attemptSection.content || attemptSection.attemptQuestion;
    fullQuestion = fullQuestion
      .replace(/<p>✋[\s\S]*?<\/p>/g, '')  // remove ✋ stop prompt
      .replace(/<hr\s*\/?>/g, '')             // remove <hr>
      .trim();

    return {
      lessonSlug: slug,
      lessonTitle: lesson.meta.title,
      lessonEmoji: lesson.meta.emoji,
      question: fullQuestion,
      options,
    };
  }

  return null;
}

// ── Lesson Progression ──

/** Flat ordered list of all lesson slugs (by section, then number) */
function getOrderedSlugs(): string[] {
  const slugs: string[] = [];
  for (const section of overviewData.sections) {
    for (const lesson of section.lessons) {
      slugs.push(lesson.slug);
    }
  }
  return slugs;
}

/** Find the next lesson slug in sequence, or null if this is the last lesson */
export function getNextLessonSlug(currentSlug: string): string | null {
  const ordered = getOrderedSlugs();
  const idx = ordered.indexOf(currentSlug);
  if (idx === -1 || idx >= ordered.length - 1) return null;
  return ordered[idx + 1];
}
