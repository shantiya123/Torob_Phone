import type { TorobcheQuerySet } from "@/types/api";
import { activeCriteria } from "../query-set";

export function QuerySetRail({ querySet }: { querySet: TorobcheQuerySet }) {
  const criteria = activeCriteria(querySet);
  return (
    <section aria-labelledby="criteria-heading" className="grid gap-3">
      <div>
        <p className="mb-1 text-xs font-semibold text-[var(--accent-radish)]">برداشت تأییدشده</p>
        <h2 id="criteria-heading" className="m-0 text-xl font-bold">
          نیازهایی که تربچه فهمیده
        </h2>
      </div>
      {criteria.length ? (
        <dl className="flex flex-wrap gap-2">
          {criteria.map((criterion) => (
            <div
              key={criterion.path}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm"
            >
              <dt className="inline text-[var(--text-muted)]">{criterion.label}: </dt>
              <dd className="m-0 inline font-semibold">
                <bdi>{criterion.value}</bdi>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="m-0 text-sm text-[var(--text-muted)]">هنوز معیار مشخصی ثبت نشده است.</p>
      )}
    </section>
  );
}
