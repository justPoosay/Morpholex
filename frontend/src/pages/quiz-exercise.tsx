import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "wouter";
import { AppHeader } from "@/components/app-header";
import { findExercise, isCorrect, parseArticle, recordScore, useBestScores } from "@/lib/quiz";
import type { QuizExercise } from "@/lib/quiz";
import NotFound from "@/pages/not-found";

const RIGHT = "text-emerald-600 dark:text-emerald-400";
const WRONG = "text-red-600 dark:text-red-400";

function messageFor(score: number, total: number): string {
  if (score === total) return "Perfect score!";
  if (score >= total - 1) return "Excellent work.";
  if (score >= 5) return "Good work.";
  if (score >= 3) return "Keep practising: the review below shows what changes in each word.";
  return "Read the review below and try again.";
}

export default function QuizExercisePage({ params }: { params: { id: string } }) {
  const exercise = findExercise(params.id);
  if (!exercise) return <NotFound />;
  // The key makes a different exercise start with empty answers.
  return <ExerciseScreen key={exercise.id} exercise={exercise} />;
}

function ExerciseScreen({ exercise }: { exercise: QuizExercise }) {
  const total = exercise.gaps.length;
  const [answers, setAnswers] = useState<string[]>(() => Array(total).fill(""));
  const [checked, setChecked] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);
  const best = useBestScores()[exercise.id];

  const correct = exercise.gaps.map((_, index) => checked && isCorrect(exercise, answers[index], index));
  const score = exercise.gaps.reduce((points, _, index) => points + (isCorrect(exercise, answers[index], index) ? 1 : 0), 0);
  const hasAnswers = answers.some((answer) => answer.trim() !== "");

  // After checking, scroll to the score; after "Try again", back to the top.
  const didCheck = useRef(false);
  useEffect(() => {
    if (checked) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      didCheck.current = true;
    } else if (didCheck.current) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [checked]);

  const check = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    recordScore(exercise.id, score);
    setChecked(true);
  };

  const reset = () => {
    setAnswers(Array(total).fill(""));
    setChecked(false);
  };

  const setAnswer = (index: number, value: string) => {
    setAnswers((previous) => previous.map((answer, i) => (i === index ? value : answer)));
  };

  /** Enter moves to the next gap, and leaves the last one. */
  const onKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (index + 1 < total) inputs.current[index + 1]?.focus();
    else event.currentTarget.blur();
  };

  const renderGap = (number: number) => {
    // Gap 0 is the example, shown as in the exam.
    if (number < 1 || number > total) {
      return (
        <span key={`gap-${number}`} className="whitespace-nowrap">
          <strong>(0)</strong> <span className="text-muted-foreground">........</span>{" "}
          <span className="text-sm font-semibold text-primary">({exercise.example.base})</span>
        </span>
      );
    }

    const index = number - 1;
    const gap = exercise.gaps[index];
    const typed = answers[index].trim();

    if (checked) {
      return (
        <span key={`gap-${number}`} className="whitespace-nowrap">
          <strong>({number})</strong>{" "}
          {!correct[index] && typed !== "" && <s className="text-muted-foreground">{typed}</s>}{" "}
          <strong className={correct[index] ? RIGHT : WRONG}>{gap.answers[0]}</strong>
        </span>
      );
    }

    return (
      <span key={`gap-${number}`} className="inline-flex items-baseline gap-1.5 whitespace-nowrap align-baseline">
        <strong>({number})</strong>
        <input
          ref={(element) => {
            inputs.current[index] = element;
          }}
          type="text"
          value={answers[index]}
          onChange={(event) => setAnswer(index, event.target.value)}
          onKeyDown={onKeyDown(index)}
          aria-label={`Gap ${number}: ${gap.base}`}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint={index + 1 < total ? "next" : "done"}
          className="w-32 border-0 border-b-2 border-muted-foreground/60 bg-transparent px-1 py-0 text-center leading-6 text-primary outline-none transition-colors focus:border-primary sm:w-40"
          data-testid={`quiz-input-${number}`}
        />
        <span className="text-sm font-semibold text-primary">({gap.base})</span>
      </span>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl space-y-8 px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <Link href="/quiz" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={15} /> All exercises
        </Link>

        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{exercise.level} · Word formation</p>
          <h1 className="font-serif text-4xl tracking-tight">{exercise.title}</h1>
          <div className="space-y-2 rounded-lg border border-border/80 bg-card px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              Type the correct form of the word in capitals next to each gap. Each correct answer is worth one point.
            </p>
            <p>
              <strong>Example:</strong> (0) ........ ({exercise.example.base}) → {exercise.example.answer.toUpperCase()}
            </p>
          </div>
        </header>

        <article className="space-y-5 text-[1.05rem]" data-testid="quiz-article">
          {parseArticle(exercise.text).map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex} className="leading-[2.6]">
              {paragraph.map((part, partIndex) =>
                part.type === "text" ? <span key={partIndex}>{part.text}</span> : renderGap(part.number),
              )}
            </p>
          ))}
        </article>

        {!checked ? (
          <button
            type="button"
            onClick={check}
            disabled={!hasAnswers}
            className="w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-50"
            data-testid="button-check"
          >
            Check answers
          </button>
        ) : (
          <>
            <div ref={resultRef} className="scroll-mt-24 space-y-3 rounded-2xl border border-border/80 bg-card p-6 text-center" data-testid="quiz-result">
              <p className="font-serif text-5xl">
                {score} / {total}
              </p>
              <p className="text-muted-foreground">{messageFor(score, total)}</p>
              {best !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Best score: {best} / {total}
                </p>
              )}
              <button
                type="button"
                onClick={reset}
                className="mt-2 w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                data-testid="button-try-again"
              >
                Try again
              </button>
            </div>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">Review</h2>
              {exercise.gaps.map((gap, index) => {
                const typed = answers[index].trim();
                const note = correct[index] ? gap.change : typed === "" ? `No answer · ${gap.change}` : `You wrote “${typed}” · ${gap.change}`;
                return (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-border/80 bg-card px-4 py-3">
                    {correct[index] ? (
                      <CheckCircle2 size={18} className={`mt-0.5 shrink-0 ${RIGHT}`} />
                    ) : (
                      <XCircle size={18} className={`mt-0.5 shrink-0 ${WRONG}`} />
                    )}
                    <div className="space-y-0.5">
                      <p className="font-semibold">
                        {index + 1}. {gap.base} → {gap.answers[0]}
                      </p>
                      <p className="text-sm text-muted-foreground">{note}</p>
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
