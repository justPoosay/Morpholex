import { Check, Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { PageSection } from "@/components/page-section";
import { useTheme, type Theme } from "@/components/theme-provider";
import { speak, speechSupported, useEnglishVoices, voiceStore } from "@/lib/speech";
import { cn } from "@/lib/utils";

const APPEARANCE_OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "Automatic", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/** What a voice says when you pick it. */
const PREVIEW_TEXT = "Morphology";

/** "en-GB" -> "British English". */
function accentName(lang: string): string {
  const code = lang.replace("_", "-");
  try {
    return new Intl.DisplayNames(["en"], { type: "language", languageDisplay: "dialect" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function ChoiceRow({ selected, title, detail, onSelect }: { selected: boolean; title: string; detail?: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
        selected ? "border-primary/60 bg-primary/5" : "border-border/80 bg-card hover:bg-muted",
      )}
    >
      <span>
        <span className="block text-foreground">{title}</span>
        {detail && <span className="block text-sm text-muted-foreground">{detail}</span>}
      </span>
      {selected && <Check size={18} className="shrink-0 text-primary" />}
    </button>
  );
}

function VoiceSection() {
  const voices = useEnglishVoices();
  const chosen = voiceStore.useValue();

  const select = (voiceURI: string) => {
    voiceStore.set(voiceURI);
    speak(PREVIEW_TEXT);
  };

  // The voices of each accent together, US English first, since that is the default.
  const groups = new Map<string, SpeechSynthesisVoice[]>();
  for (const voice of voices) {
    const lang = voice.lang.replace("_", "-");
    groups.set(lang, [...(groups.get(lang) ?? []), voice]);
  }
  const ordered = [...groups.entries()]
    .map(([lang, list]) => ({ lang, title: accentName(lang), voices: list.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => (a.lang === "en-US" ? -1 : b.lang === "en-US" ? 1 : a.title.localeCompare(b.title)));

  return (
    <PageSection title="Voice" description="The voice that reads words aloud. Pick one to hear it. The choices depend on your browser and device.">
      {!speechSupported ? (
        <p className="text-sm text-muted-foreground">Your browser can't read words aloud.</p>
      ) : voices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No English voices found yet. Some browsers load them a moment after the page opens.</p>
      ) : (
        <div role="radiogroup" aria-label="Voice" className="space-y-6">
          <ChoiceRow selected={chosen === ""} title="Automatic" detail="Default US English voice" onSelect={() => select("")} />
          {ordered.map((group) => (
            <div key={group.lang} className="space-y-2">
              <h3 className="pt-1 text-sm font-semibold text-muted-foreground">{group.title}</h3>
              {group.voices.map((voice) => (
                <ChoiceRow
                  key={voice.voiceURI}
                  selected={chosen === voice.voiceURI}
                  title={voice.name}
                  detail={voice.localService ? undefined : "Online voice"}
                  onSelect={() => select(voice.voiceURI)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </PageSection>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl space-y-12 px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
        <h1 className="font-serif text-4xl tracking-tight">Settings</h1>

        <PageSection title="Appearance" description="Automatic follows your device's light or dark setting, and changes with it.">
          <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-2">
            {APPEARANCE_OPTIONS.map(({ value, label, icon: Icon }) => {
              const selected = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border py-4 text-sm transition-colors",
                    selected
                      ? "border-transparent bg-primary font-medium text-primary-foreground"
                      : "border-border/80 bg-card text-foreground hover:bg-muted",
                  )}
                  data-testid={`appearance-${value}`}
                >
                  <Icon size={20} />
                  {label}
                </button>
              );
            })}
          </div>
        </PageSection>

        <VoiceSection />
      </main>
    </div>
  );
}
