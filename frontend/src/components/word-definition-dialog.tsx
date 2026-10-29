import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Heart, Loader2, Search, Volume2, X } from "lucide-react";
import { useWordDefinition } from "@/hooks/use-word-definition";
import type { Run } from "@/hooks/use-word-definition";
import { useSavedWords } from "@/lib/saved-words";
import { speak, speechSupported } from "@/lib/speech";
import { wiktionaryUrl } from "@/lib/wiktionary";
import { validateWordQuery } from "@/lib/word-query";

/** How many meanings of each part of speech show before "Show all". */
const COLLAPSED_COUNT = 3;

interface WordDefinitionDialogProps {
  open: boolean;
  word: string;
  onClose: () => void;
  /** Switches the dialog to another word, e.g. the base word of "plural of lighter". */
  onLookup: (word: string) => void;
  /** Closes the dialog and shows the word's family on the home page. */
  onShowFamily: (word: string) => void;
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-primary transition-colors hover:bg-muted/70"
    >
      {children}
    </button>
  );
}

/** Example sentence text, with the looked-up word in bold. */
function RunsText({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((run, index) =>
        run.bold ? (
          <strong key={index} className="font-semibold text-foreground">
            {run.text}
          </strong>
        ) : (
          <span key={index}>{run.text}</span>
        ),
      )}
    </>
  );
}

export function WordDefinitionDialog({ open, word, onClose, onLookup, onShowFamily }: WordDefinitionDialogProps) {
  const { data, isLoading, isError, refetch } = useWordDefinition(open ? word : "");
  const { isSaved, toggle } = useSavedWords();
  const saved = isSaved(word);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // A different word starts with every section collapsed again.
  useEffect(() => {
    setExpanded(new Set());
  }, [word]);

  const canSearch = validateWordQuery(word).ok;

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 focus:outline-none sm:p-8"
          data-testid="definition-dialog"
        >
          <Dialog.Close
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </Dialog.Close>

          <div className="space-y-6">
            <div className="space-y-3 border-b border-border/50 pb-5 pr-8">
              <Dialog.Title className="font-serif text-3xl leading-tight text-foreground [overflow-wrap:anywhere]">
                {word}
              </Dialog.Title>

              <div className="flex flex-wrap items-center gap-2">
                {speechSupported && (
                  <RoundButton label={`Pronounce ${word}`} onClick={() => speak(word)}>
                    <Volume2 size={16} />
                  </RoundButton>
                )}
                <RoundButton label={saved ? `Remove ${word} from saved words` : `Save ${word}`} onClick={() => toggle(word)}>
                  <Heart size={16} className={saved ? "fill-current" : undefined} />
                </RoundButton>
                {canSearch && (
                  <button
                    type="button"
                    onClick={() => onShowFamily(word)}
                    className="ml-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    data-testid="button-show-family"
                  >
                    <Search size={14} />
                    Show word family
                  </button>
                )}
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={28} className="animate-spin text-muted-foreground" />
              </div>
            )}

            {isError && !isLoading && (
              <div className="space-y-3 py-8 text-center">
                <p className="text-muted-foreground">
                  Couldn't load the definition. Check your internet connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Try again
                </button>
              </div>
            )}

            {data === null && !isLoading && (
              <p className="py-8 text-center text-muted-foreground">No definition found for “{word}”.</p>
            )}

            {data &&
              data.meanings.map((meaning) => {
                const isExpanded = expanded.has(meaning.partOfSpeech);
                const shown = isExpanded ? meaning.definitions : meaning.definitions.slice(0, COLLAPSED_COUNT);

                return (
                  <section key={meaning.partOfSpeech}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary/80">
                      {meaning.partOfSpeech}
                    </h3>
                    <ol className="list-none space-y-4">
                      {shown.map((definition, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="w-5 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">{index + 1}.</span>
                          <div className="space-y-1.5">
                            <p className="text-sm leading-relaxed text-foreground">{definition.definition}</p>
                            {definition.example && (
                              <p className="border-l-2 border-primary/40 pl-3 text-sm italic leading-relaxed text-muted-foreground">
                                <RunsText runs={definition.example} />
                              </p>
                            )}
                            {definition.baseWord && definition.baseWord.toLowerCase() !== word.toLowerCase() && (
                              <button
                                type="button"
                                onClick={() => onLookup(definition.baseWord!)}
                                className="text-sm font-medium text-primary hover:underline"
                              >
                                Look up “{definition.baseWord}”
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                    {!isExpanded && meaning.definitions.length > COLLAPSED_COUNT && (
                      <button
                        type="button"
                        onClick={() => setExpanded((previous) => new Set(previous).add(meaning.partOfSpeech))}
                        className="mt-3 text-sm font-medium text-primary hover:underline"
                      >
                        Show all {meaning.definitions.length} meanings
                      </button>
                    )}
                  </section>
                );
              })}

            {data && (
              <a
                href={wiktionaryUrl(word)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Definitions from Wiktionary, CC BY-SA 4.0
              </a>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
