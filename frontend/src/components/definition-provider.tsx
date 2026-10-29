import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { WordDefinitionDialog } from "@/components/word-definition-dialog";
import { stopSpeaking } from "@/lib/speech";

interface DefinitionContextValue {
  /** Opens the definition pop-up for a word. */
  lookup: (word: string) => void;
}

const DefinitionContext = createContext<DefinitionContextValue>({ lookup: () => undefined });

export const useDefinition = () => useContext(DefinitionContext);

/** Hosts the one definition pop-up that every page opens through `useDefinition().lookup`. */
export function DefinitionProvider({ children }: { children: ReactNode }) {
  const [word, setWord] = useState("");
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const lookup = useCallback((next: string) => {
    setWord(next.trim().toLowerCase());
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    stopSpeaking();
  }, []);

  return (
    <DefinitionContext.Provider value={{ lookup }}>
      {children}
      <WordDefinitionDialog
        open={open}
        word={word}
        onClose={close}
        onLookup={lookup}
        onShowFamily={(target) => {
          close();
          navigate(`/?q=${encodeURIComponent(target)}`);
        }}
      />
    </DefinitionContext.Provider>
  );
}
