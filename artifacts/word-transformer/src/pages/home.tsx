import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Moon, Sun, History, ArrowRight } from "lucide-react";
import { useTransformWord } from "@workspace/api-client-react";
import { useTheme } from "@/components/theme-provider";
import { useWordDefinition } from "@/hooks/use-word-definition";
import { WordDefinitionDialog } from "@/components/word-definition-dialog";

export default function Home() {
  const [searchInput, setSearchInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const { theme, setTheme } = useTheme();
  
  const transformMutation = useTransformWord();
  const inputRef = useRef<HTMLInputElement>(null);
  const wordDef = useWordDefinition();

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
    if (!word.trim()) return;
    const cleanWord = word.trim().toLowerCase();
    setSearchInput(cleanWord);
    transformMutation.mutate({ data: { word: cleanWord } }, {
      onSuccess: () => {
        addToHistory(cleanWord);
      }
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchInput);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const hasSearched = transformMutation.data || transformMutation.isPending;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground transition-colors duration-300 font-sans selection:bg-primary/20 selection:text-primary">
      {/* Header / Nav */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="font-serif font-semibold text-lg tracking-tight text-primary flex items-center gap-0.5">
          <span className="w-6 h-6 rounded bg-[#FF3C00] text-white flex items-center justify-center text-xs shadow-sm font-serif font-semibold">M</span>
          <span>orpholex</span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          data-testid="button-toggle-theme"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className={`max-w-4xl mx-auto px-4 md:px-8 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${hasSearched ? "pt-28 pb-20" : "pt-[30vh] pb-20"}`}>
        
        {/* Search Section */}
        <div className="flex flex-col items-center max-w-2xl mx-auto w-full">
          {!hasSearched && (
            <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="font-serif text-5xl md:text-6xl text-foreground tracking-tight mb-4">
                Morpholex
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl font-light">
                Discover the morphological landscape of any English word.
              </p>
            </div>
          )}

          <form onSubmit={onSubmit} className="w-full relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <Search size={20} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. consider, analyze, light..."
              className="w-full bg-card border-2 border-border/50 rounded-xl py-4 pl-12 pr-14 text-lg md:text-xl shadow-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300 placeholder:text-muted-foreground/60"
              data-testid="input-search"
            />
            <button
              type="submit"
              disabled={!searchInput.trim() || transformMutation.isPending}
              className="absolute inset-y-2 right-2 px-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-all flex items-center gap-2"
              data-testid="button-submit-search"
            >
              {transformMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ArrowRight size={18} />
              )}
            </button>
          </form>

          {/* History Tags - Only show if not searched yet, or small under search */}
          {history.length > 0 && (
            <div className={`w-full mt-6 flex flex-wrap gap-2 justify-center transition-all duration-500 ${hasSearched ? 'opacity-0 h-0 overflow-hidden mt-0' : 'opacity-100'}`}>
              <div className="w-full text-center text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1.5 uppercase tracking-widest font-semibold">
                <History size={12} /> Recent
              </div>
              {history.map((h, i) => (
                <button
                  key={`${h}-${i}`}
                  onClick={() => handleSearch(h)}
                  className="px-3 py-1.5 rounded-full text-sm bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/40 transition-colors"
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
          <div className="mt-12 p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center text-destructive animate-in fade-in slide-in-from-top-4" data-testid="error-message">
            <p className="font-medium">Failed to analyze word.</p>
            <p className="text-sm opacity-80 mt-1">Make sure it's a valid English word and try again.</p>
          </div>
        )}

        {transformMutation.data && !transformMutation.isPending && (
          <div className="mt-16 animate-in fade-in duration-700 slide-in-from-bottom-8">
            <div className="mb-10 text-center md:text-left border-b border-border/50 pb-6">
              <h2 className="font-serif text-4xl md:text-5xl text-foreground" data-testid="text-original-word">
                {transformMutation.data.originalWord}
              </h2>
              <p className="text-muted-foreground mt-2 font-mono text-sm tracking-wide">
                Morphological analysis • {transformMutation.data.groups.reduce((acc, g) => acc + g.words.length, 0)} forms found
              </p>
            </div>

            {transformMutation.data.groups.length === 0 ? (
              <div className="text-center p-12 bg-card rounded-2xl border border-border border-dashed">
                <p className="text-muted-foreground text-lg">No transformations found for this word.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                {transformMutation.data.groups.map((group, groupIdx) => (
                  <div key={group.category} className="space-y-4" data-testid={`group-${group.category.toLowerCase().replace(/\s+/g, '-')}`}>
                    <h3 className="font-serif text-xl md:text-2xl text-foreground flex items-baseline gap-3 border-b border-border/30 pb-2">
                      <span className="text-primary/60 font-mono text-sm">{(groupIdx + 1).toString().padStart(2, '0')}</span>
                      {group.category}
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {group.words.map((word) => (
                        <button
                          key={word}
                          onClick={() => wordDef.lookup(word)}
                          className="px-3.5 py-2 rounded-lg bg-card border border-border/80 text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-200 text-base shadow-sm hover:shadow active:scale-95 text-left"
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

      <WordDefinitionDialog
        open={wordDef.open}
        onClose={wordDef.close}
        definition={wordDef.definition}
        loading={wordDef.loading}
        error={wordDef.error}
        onSearch={handleSearch}
      />
    </div>
  );
}