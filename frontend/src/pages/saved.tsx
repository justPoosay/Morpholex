import { Heart, HeartOff, Search, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { AppHeader } from "@/components/app-header";
import { useDefinition } from "@/components/definition-provider";
import { useSavedWords } from "@/lib/saved-words";
import { speak, speechSupported } from "@/lib/speech";
import { validateWordQuery } from "@/lib/word-query";

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

export default function Saved() {
  const { words, remove } = useSavedWords();
  const { lookup } = useDefinition();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl space-y-8 px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl tracking-tight">Saved words</h1>
          <p className="text-sm text-muted-foreground">
            Words you save with the heart in a definition. They are kept in this browser.
          </p>
        </div>

        {words.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
            <Heart size={36} className="text-primary/60" />
            <p className="font-serif text-xl">No saved words yet</p>
            <p className="text-sm text-muted-foreground">Open a word and tap the heart to save it here.</p>
          </div>
        ) : (
          <ul className="space-y-2" data-testid="saved-list">
            {words.map((word) => (
              <li key={word} className="flex items-center gap-1 rounded-lg border border-border/80 bg-card py-1.5 pl-4 pr-2">
                <button
                  type="button"
                  onClick={() => lookup(word)}
                  className="min-w-0 flex-1 py-1.5 text-left font-serif text-xl text-foreground transition-colors [overflow-wrap:anywhere] hover:text-primary"
                  data-testid={`saved-word-${word}`}
                >
                  {word}
                </button>
                {speechSupported && (
                  <IconButton label={`Pronounce ${word}`} onClick={() => speak(word)}>
                    <Volume2 size={17} />
                  </IconButton>
                )}
                {/* Multi-word entries like "a cappella" can't be searched. */}
                {validateWordQuery(word).ok && (
                  <IconButton label={`Show the word family of ${word}`} onClick={() => navigate(`/?q=${encodeURIComponent(word)}`)}>
                    <Search size={17} />
                  </IconButton>
                )}
                <IconButton label={`Remove ${word} from saved words`} onClick={() => remove(word)}>
                  <HeartOff size={17} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
