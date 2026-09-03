import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Moon, Sun, History, ArrowRight } from "lucide-react";
import { ApiError, useTransformWord } from "@/api";
import { useTheme } from "@/components/theme-provider";
import {
  sanitizeWordQueryInput,
  validateWordQuery,
  WORD_QUERY_MAX_LENGTH,
  WORD_QUERY_RULE_MESSAGE,
} from "@/lib/word-query";
// Definition lookup is disabled for now. Keep these here for a future restore.
// import { useWordDefinition } from "@/hooks/use-word-definition";
// import { WordDefinitionDialog } from "@/components/word-definition-dialog";

const RETRYABLE_API_STATUSES = new Set([500, 502, 503, 504]);

function shouldRetryTransformRequest(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false;

  if (error instanceof ApiError) {
    return RETRYABLE_API_STATUSES.has(error.status);
  }

  return error instanceof TypeError;
}

export default function Home() {
  const [searchInput, setSearchInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  
  const transformMutation = useTransformWord({
    mutation: {
      retry: shouldRetryTransformRequest,
      retryDelay: 750,
    },
  });
  const inputRef = useRef<HTMLInputElement>(null);
  // const wordDef = useWordDefinition();

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem("word-transformer-history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const addToHistory = (word: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((w) => w.toLowerCase() !== word.toLowerCase());
      const newHistory = [word, ...filtered].slice(0, 10);
      localStorage.setItem("word-transformer-history", JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const handleSearch = (word: string) => {
    const validated = validateWordQuery(word);
    if (!validated.ok) {
      setQueryError(validated.message);
      return;
    }

    setQueryError(null);
    setSearchInput(validated.word);
    transformMutation.mutate({ data: { word: validated.word } }, {
      onSuccess: () => {
        addToHistory(validated.word);
      }
    });
  };

  const handleSearchInputChange = (value: string) => {
    const sanitized = sanitizeWordQueryInput(value);
    setSearchInput(sanitized);

    if (value.toLowerCase() !== sanitized) {
      setQueryError(WORD_QUERY_RULE_MESSAGE);
      return;
    }

    if (!sanitized || validateWordQuery(sanitized).ok) {
      setQueryError(null);
    } else {
      setQueryError(WORD_QUERY_RULE_MESSAGE);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchInput);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const hasSearched = transformMutation.data || transformMutation.isPending;
  const canSubmit =
    !transformMutation.isPending && searchInput.trim() !== "" && validateWordQuery(searchInput).ok;

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground transition-colors duration-300 font-sans selection:bg-primary/20 selection:text-primary">
      {/* Header / Nav */}
      <header className="fixed left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="font-serif font-semibold text-lg tracking-tight text-primary flex items-center gap-0.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#FF3C00] font-serif text-xs font-semibold text-white shadow-sm">M</span>
          <span>orpholex</span>
        </div>
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          data-testid="button-toggle-theme"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className={`mx-auto w-full max-w-4xl px-4 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:px-6 md:px-8 ${hasSearched ? "pt-24 pb-12 sm:pt-28 sm:pb-20" : "flex min-h-[100dvh] flex-col justify-center pt-24 pb-12 sm:pt-28 sm:pb-20"}`}>
        
        {/* Search Section */}
        <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col items-center">
          {!hasSearched && (
            <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 sm:mb-10">
              <h1 className="mb-3 font-serif text-4xl tracking-tight text-foreground sm:mb-4 sm:text-5xl md:text-6xl">
                Morpholex
              </h1>
              <p className="mx-auto max-w-xl text-base font-light text-muted-foreground sm:text-lg md:text-xl">
                Discover the morphological landscape of any English word.
              </p>
            </div>
          )}

          <form onSubmit={onSubmit} className="group relative w-full max-w-full">
            <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted-foreground transition-colors group-focus-within:text-primary sm:left-4">
              <Search size={20} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              placeholder="e.g. consider, can't, light..."
              maxLength={WORD_QUERY_MAX_LENGTH}
              aria-invalid={queryError ? "true" : "false"}
              autoCapitalize="none"
              spellCheck={false}
              className="w-full rounded-lg border-2 border-border/50 bg-card py-3.5 pl-11 pr-12 text-base shadow-sm transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 sm:rounded-xl sm:py-4 sm:pl-12 sm:pr-14 sm:text-lg md:text-xl"
              data-testid="input-search"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="absolute inset-y-2 right-2 flex aspect-square w-9 items-center justify-center rounded-md bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary sm:w-10 sm:rounded-lg"
              data-testid="button-submit-search"
            >
              {transformMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ArrowRight size={18} />
              )}
            </button>
          </form>
          {queryError && (
            <p className="mt-3 w-full text-center text-sm text-muted-foreground" data-testid="text-query-rules">
              {queryError}
            </p>
          )}

          {/* History Tags - Only show if not searched yet, or small under search */}
          {history.length > 0 && (
            <div className={`mt-6 flex w-full flex-wrap justify-center gap-2 transition-all duration-500 ${hasSearched ? 'h-0 overflow-hidden opacity-0 mt-0' : 'opacity-100'}`}>
              <div className="mb-2 flex w-full items-center justify-center gap-1.5 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <History size={12} /> Recent
              </div>
              {history.map((h, i) => (
                <button
                  key={`${h}-${i}`}
                  onClick={() => handleSearch(h)}
                  className="max-w-full rounded-full border border-border/40 bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  data-testid={`button-history-${h}`}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results Area */}
        {transformMutation.isError && (
          <div className="mt-8 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center text-destructive animate-in fade-in slide-in-from-top-4 sm:mt-12 sm:rounded-xl sm:p-6" data-testid="error-message">
            <p className="font-medium">Search unavailable.</p>
            <p className="text-sm opacity-80 mt-1">Please try again in a moment.</p>
          </div>
        )}

        {transformMutation.data && !transformMutation.isPending && (
          <div className="mt-10 animate-in fade-in duration-700 slide-in-from-bottom-8 sm:mt-14 md:mt-16">
            <div className="mb-6 border-b border-border/50 pb-5 text-center sm:mb-10 md:text-left md:pb-6">
              <h2 className="break-words font-serif text-3xl text-foreground sm:text-4xl md:text-5xl" data-testid="text-original-word">
                {transformMutation.data.originalWord}
              </h2>
              <p className="mt-2 break-words font-mono text-sm tracking-wide text-muted-foreground">
                Morphological analysis - {transformMutation.data.groups.reduce((acc, g) => acc + g.words.length, 0)} forms found
              </p>
            </div>

            {transformMutation.data.groups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center sm:p-12">
                <p className="text-base text-muted-foreground sm:text-lg">No transformations found for this word.</p>
              </div>
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
                {transformMutation.data.groups.map((group, groupIdx) => (
                  <div key={group.category} className="min-w-0 space-y-4" data-testid={`group-${group.category.toLowerCase().replace(/\s+/g, '-')}`}>
                    <h3 className="flex items-baseline gap-3 border-b border-border/30 pb-2 font-serif text-xl text-foreground md:text-2xl">
                      <span className="shrink-0 font-mono text-sm text-primary/60">{(groupIdx + 1).toString().padStart(2, '0')}</span>
                      {group.category}
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {group.words.map((word) => (
                        <button
                          key={word}
                          type="button"
                          // onClick={() => wordDef.lookup(word)}
                          className="max-w-full break-words rounded-lg border border-border/80 bg-card px-3.5 py-2 text-left text-sm text-foreground shadow-sm transition-all duration-200 [overflow-wrap:anywhere] hover:border-primary/50 hover:bg-primary/5 hover:text-primary hover:shadow active:scale-95 sm:text-base"
                          data-testid={`button-word-${word}`}
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Definition lookup is disabled for now.
      <WordDefinitionDialog
        open={wordDef.open}
        onClose={wordDef.close}
        word={wordDef.word}
        definition={wordDef.definition}
        loading={wordDef.loading}
        error={wordDef.error}
        onSearch={handleSearch}
      />
      */}
    </div>
  );
}
