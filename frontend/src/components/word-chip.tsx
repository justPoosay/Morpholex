import type { ReactNode } from "react";
import { Copy, ExternalLink, Heart, HeartOff, Search, Volume2 } from "lucide-react";
import { useLocation } from "wouter";
import { useDefinition } from "@/components/definition-provider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "@/hooks/use-toast";
import { useSavedWords } from "@/lib/saved-words";
import { speak, speechSupported } from "@/lib/speech";
import { wiktionaryUrl } from "@/lib/wiktionary";
import { validateWordQuery } from "@/lib/word-query";
import { cn } from "@/lib/utils";

const STYLES = {
  chip: "max-w-full break-words rounded-lg border border-border/80 bg-card px-3.5 py-2 text-left text-sm text-foreground shadow-sm transition-all duration-200 [overflow-wrap:anywhere] hover:border-primary/50 hover:bg-primary/5 hover:text-primary hover:shadow active:scale-95 sm:text-base",
  pill: "max-w-full rounded-full border border-border/40 bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary",
};

interface WordChipProps {
  word: string;
  variant?: keyof typeof STYLES;
  /** What a click does; by default it opens the word's definition. */
  onClick?: () => void;
  testId?: string;
  /** Extra items at the top of the right-click / long-press menu. */
  menuItems?: ReactNode;
}

/**
 * A word as a button. Clicking opens its definition; right-clicking (or holding it on a touch
 * screen) opens a menu to pronounce, copy or look at the word's family.
 */
export function WordChip({ word, variant = "chip", onClick, testId, menuItems }: WordChipProps) {
  const { lookup } = useDefinition();
  const [, navigate] = useLocation();
  const { isSaved, toggle } = useSavedWords();
  const saved = isSaved(word);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(word);
      toast({ title: "Copied", description: word });
    } catch {
      toast({ title: "Couldn't copy", description: "Your browser didn't allow it.", variant: "destructive" });
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button type="button" onClick={onClick ?? (() => lookup(word))} className={cn(STYLES[variant])} data-testid={testId}>
          {word}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {menuItems}
        {speechSupported && (
          <ContextMenuItem onSelect={() => speak(word)}>
            <Volume2 className="mr-2 h-4 w-4" />
            Pronounce
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={copy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => toggle(word)}>
          {saved ? <HeartOff className="mr-2 h-4 w-4" /> : <Heart className="mr-2 h-4 w-4" />}
          {saved ? "Remove from saved" : "Save"}
        </ContextMenuItem>
        {/* Multi-word entries like "a cappella" can't be searched. */}
        {validateWordQuery(word).ok && (
          <ContextMenuItem onSelect={() => navigate(`/?q=${encodeURIComponent(word)}`)}>
            <Search className="mr-2 h-4 w-4" />
            Show word family
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={() => window.open(wiktionaryUrl(word), "_blank", "noopener,noreferrer")}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in Wiktionary
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
