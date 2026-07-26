import Link from "next/link";
import { Container, Panel } from "@/components/ui";

export default function UnauthorizedPage() {
  return (
    <main id="main-content">
      <Container className="py-12">
        <Panel className="grid gap-4 text-center">
          <h1 className="m-0 text-2xl font-bold">دسترسی مجاز نیست</h1>
          <p className="m-0 text-[var(--text-secondary)]">
            این حساب اجازه مشاهده این بخش را ندارد.
          </p>
          <Link className="text-[var(--accent-radish)] underline-offset-4 hover:underline" href="/">
            بازگشت به خانه
          </Link>
        </Panel>
      </Container>
    </main>
  );
}
