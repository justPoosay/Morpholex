import quizData from "@/data/quiz.json";
import { createStore } from "@/lib/storage";

/**
 * Word formation exercises, like Part 3 of the Cambridge C1 Advanced and C2 Proficiency exams:
 * a short article with eight gaps, each with a base word in capitals to turn into a word that fits.
 * The data in src/data/quiz.json is the same as in the iOS app.
 */
export interface QuizGap {
  /** The word in capitals shown after the gap. */
  base: string;
  /** Every spelling that counts as correct; the first one is shown as the answer. */
  answers: string[];
  /** A few words on what changes, shown after checking (for example "verb → noun"). */
  change: string;
}

export interface QuizExercise {
  id: string;
  title: string;
  level: string;
  example: { base: string; answer: string };
  /** `{0}` marks the example gap and `{1}` to `{8}` the gaps to fill; a blank line separates paragraphs. */
  text: string;
  gaps: QuizGap[];
}

export const exercises = quizData as QuizExercise[];

export function findExercise(id: string): QuizExercise | undefined {
  return exercises.find((exercise) => exercise.id === id);
}

/** Whether a typed answer is right for a gap (0-based). Capitals and spaces around the word don't matter. */
export function isCorrect(exercise: QuizExercise, answer: string, gapIndex: number): boolean {
  return exercise.gaps[gapIndex].answers.includes(answer.trim().toLowerCase());
}

/** A piece of an article: plain text, or a gap (0 is the example). */
export type ArticlePart = { type: "text"; text: string } | { type: "gap"; number: number };

/** The article as paragraphs of text and gaps. */
export function parseArticle(text: string): ArticlePart[][] {
  return text.split("\n\n").map((paragraph) => {
    const parts: ArticlePart[] = [];
    let last = 0;

    for (const match of paragraph.matchAll(/\{(\d+)\}/g)) {
      const start = match.index ?? 0;
      if (start > last) parts.push({ type: "text", text: paragraph.slice(last, start) });
      parts.push({ type: "gap", number: Number(match[1]) });
      last = start + match[0].length;
    }
    if (last < paragraph.length) parts.push({ type: "text", text: paragraph.slice(last) });

    return parts;
  });
}

/** The best score of each exercise, by id. */
const bestStore = createStore<Record<string, number>>("morpholex-quiz-best", {});

export function recordScore(id: string, score: number) {
  const scores = bestStore.get();
  if (scores[id] === undefined || score > scores[id]) bestStore.set({ ...scores, [id]: score });
}

export function useBestScores(): Record<string, number> {
  return bestStore.useValue();
}
