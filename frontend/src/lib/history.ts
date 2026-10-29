import { createStore } from "@/lib/storage";

/** How many recent searches are kept. */
const MAX_HISTORY = 10;

/** The recent searches, newest first. The key is the one the home page has always used, so existing history is kept. */
const historyStore = createStore<string[]>("word-transformer-history", []);

/** Puts a word at the top of the recent searches (moving it up if it was already there). */
export function addToHistory(word: string) {
  const others = historyStore.get().filter((entry) => entry.toLowerCase() !== word.toLowerCase());
  historyStore.set([word, ...others].slice(0, MAX_HISTORY));
}

export function removeFromHistory(word: string) {
  historyStore.set(historyStore.get().filter((entry) => entry !== word));
}

export function clearHistory() {
  historyStore.set([]);
}

/** The recent searches, kept up to date wherever they change (also in other tabs). */
export function useHistory(): string[] {
  return historyStore.useValue();
}
