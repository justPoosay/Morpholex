import { createStore } from "@/lib/storage";

/** The words saved with the heart button, newest first. */
const savedStore = createStore<string[]>("morpholex-saved-words", []);

const normalize = (word: string) => word.trim().toLowerCase();

/** Saves the word, or removes it if it was already saved. */
export function toggleSavedWord(word: string) {
  const key = normalize(word);
  const words = savedStore.get();
  savedStore.set(words.includes(key) ? words.filter((saved) => saved !== key) : [key, ...words]);
}

export function removeSavedWord(word: string) {
  const key = normalize(word);
  savedStore.set(savedStore.get().filter((saved) => saved !== key));
}

/** The saved words, kept up to date wherever they change (also in other tabs). */
export function useSavedWords() {
  const words = savedStore.useValue();
  return {
    words,
    isSaved: (word: string) => words.includes(normalize(word)),
    toggle: toggleSavedWord,
    remove: removeSavedWord,
  };
}
