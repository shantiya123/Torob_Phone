import Image from "next/image";
import Link from "next/link";

export function TorobcheMark({ link = true }: { link?: boolean }) {
  const content = (
    <>
      <Image src="/icon.svg" alt="" width={28} height={28} className="size-7 rounded-lg" />
      <span className="font-semibold text-[var(--text-primary)]">Torobche</span>
    </>
  );

  if (!link) return <span className="inline-flex items-center gap-2">{content}</span>;
  return (
    <Link
      href="/torobche"
      className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-2 transition-colors hover:bg-[var(--surface-interactive)] focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}
