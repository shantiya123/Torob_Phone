import type { ReactNode } from "react";
import { Container, Panel } from "@/components/ui";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main id="main-content">
      <Container className="grid min-h-[70vh] place-items-center py-12">
        <Panel className="w-full max-w-[520px]">
          <header className="mb-6 grid gap-2">
            <h1 className="m-0 text-2xl font-bold">{title}</h1>
            {description && (
              <p className="m-0 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
            )}
          </header>
          {children}
        </Panel>
      </Container>
    </main>
  );
}
