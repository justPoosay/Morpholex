import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, Search } from "lucide-react";
import type { WordDefinition } from "@/hooks/use-word-definition";

interface WordDefinitionDialogProps {
  open: boolean;
  onClose: () => void;
  definition: WordDefinition | null;
  loading: boolean;
  error: boolean;
  onSearch: (word: string) => void;
}

export function WordDefinitionDialog({
  open,
  onClose,
  definition,
  loading,
  error,
  onSearch,
}: WordDefinitionDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-in fade-in duration-200" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[80vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-xl p-8 animate-in fade-in zoom-in-95 duration-200 focus:outline-none">

          <Dialog.Close
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </Dialog.Close>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {error && !loading && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No definition found for this word.</p>
            </div>
          )}

          {definition && !loading && (
            <div className="space-y-6">
              <div className="border-b border-border/50 pb-5">
                <Dialog.Title className="font-serif text-3xl text-foreground">
                  {definition.word}
                </Dialog.Title>
                {definition.phonetic && (
                  <p className="text-muted-foreground font-mono text-sm mt-1 tracking-wide">
                    {definition.phonetic}
                  </p>
                )}
              </div>

              <div className="space-y-6">
                {definition.meanings.map((meaning, i) => (
                  <div key={i}>
                    <p className="text-xs uppercase tracking-widest font-semibold text-primary/70 mb-3">
                      {meaning.partOfSpeech}
                    </p>
                    <ol className="space-y-3 list-none">
                      {meaning.definitions.map((def, j) => (
                        <li key={j} className="flex gap-3">
                          <span className="font-mono text-xs text-muted-foreground/60 pt-0.5 shrink-0 w-4">
                            {j + 1}.
                          </span>
                          <div>
                            <p className="text-foreground text-sm leading-relaxed">{def.definition}</p>
                            {def.example && (
                              <p className="text-muted-foreground text-sm italic mt-1 leading-relaxed">
                                "{def.example}"
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/50 pt-5">
                <button
                  onClick={() => {
                    onSearch(definition.word);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Search size={15} />
                  Search morphology for "{definition.word}"
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
