import type { ReactNode } from "react";

interface PageSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** A titled block on the Settings and other pages. */
export function PageSection({ title, description, children }: PageSectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
