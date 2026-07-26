import { Container, Panel } from "@/components/ui";

export function ShellPlaceholder({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <main id="main-content" tabIndex={-1}>
      <Container className="grid min-h-[62vh] place-items-center py-16">
        <Panel className="w-full max-w-2xl text-center">
          <p className="m-0 text-sm font-semibold text-[var(--accent-radish)]">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-[var(--text-secondary)]">
            {description}
          </p>
        </Panel>
      </Container>
    </main>
  );
}
