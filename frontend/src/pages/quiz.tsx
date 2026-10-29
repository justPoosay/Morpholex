import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { AppHeader } from "@/components/app-header";
import { exercises, useBestScores } from "@/lib/quiz";
import { cn } from "@/lib/utils";

export default function Quiz() {
  const best = useBestScores();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl space-y-8 px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl tracking-tight">Quiz</h1>
          <p className="text-sm text-muted-foreground">
            Word formation, as in the Cambridge exams: turn the word in capitals into a word that fits each gap. One
            point for every correct answer.
          </p>
        </div>

        <ul className="space-y-3" data-testid="quiz-list">
          {exercises.map((exercise) => {
            const score = best[exercise.id];
            const total = exercise.gaps.length;
            return (
              <li key={exercise.id}>
                <Link
                  href={`/quiz/${exercise.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border/80 bg-card px-4 py-3.5 transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-lg text-foreground">{exercise.title}</span>
                    <span className="block text-sm text-muted-foreground">
                      {exercise.level} · {total} gaps
                    </span>
                  </span>
                  {score !== undefined && (
                    <span
                      className={cn(
                        "font-mono text-sm font-semibold",
                        score === total ? "text-emerald-600 dark:text-emerald-400" : "text-primary",
                      )}
                    >
                      {score}/{total}
                    </span>
                  )}
                  <ChevronRight size={16} className="shrink-0 text-muted-foreground/60" />
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
