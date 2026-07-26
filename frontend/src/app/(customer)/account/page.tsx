import { Container, Panel } from "@/components/ui";
import { LogoutButton } from "@/features/auth/components/auth-states";
import { RequireRole } from "@/features/auth/components/guards";

function AccountPlaceholder() {
  return (
    <main id="main-content">
      <Container className="py-12">
        <Panel className="grid gap-4">
          <h1 className="m-0 text-2xl font-bold">حساب مشتری</h1>
          <p className="m-0 text-[var(--text-secondary)]">
            فضای حساب در Task Group بعدی تکمیل می‌شود.
          </p>
          <LogoutButton />
        </Panel>
      </Container>
    </main>
  );
}
export default function AccountPage() {
  return (
    <RequireRole role="customer">
      <AccountPlaceholder />
    </RequireRole>
  );
}
