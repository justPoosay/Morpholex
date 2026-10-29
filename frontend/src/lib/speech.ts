import { useEffect, useState } from "react";
import { createStore } from "@/lib/storage";

/** The voice chosen in Settings: its voiceURI, or "" for the default US English voice. */
export const voiceStore = createStore<string>("morpholex-voice", "");

export const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

/** The English voices this browser has. */
export function listEnglishVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported) return [];
  return window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("en"));
}

/** The English voices, updated when the browser finishes loading them (many load after the page). */
export function useEnglishVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState(listEnglishVoices);

  useEffect(() => {
    if (!speechSupported) return;
    const update = () => setVoices(listEnglishVoices());
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  return voices;
}

/** Reads a word aloud with the voice chosen in Settings (or the default US English one). */
export function speak(text: string) {
  if (!speechSupported) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = listEnglishVoices();
  const chosen =
    voices.find((voice) => voice.voiceURI === voiceStore.get()) ??
    voices.find((voice) => voice.lang.replace("_", "-").toLowerCase() === "en-us") ??
    voices[0];

  if (chosen) {
    utterance.voice = chosen;
    utterance.lang = chosen.lang;
  } else {
    utterance.lang = "en-US";
  }
  // A little slower than normal speech, so single words are easy to hear.
  utterance.rate = 0.9;
  synth.speak(utterance);
}

export function stopSpeaking() {
  if (speechSupported) window.speechSynthesis.cancel();
}
