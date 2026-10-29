import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { PageSection } from "@/components/page-section";
import { useTheme, type Theme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const APPEARANCE_OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "Automatic", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

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
      </main>
    </div>
  );
}
