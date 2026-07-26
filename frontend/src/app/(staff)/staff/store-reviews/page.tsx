import { Container, Panel } from "@/components/ui";
import { LogoutButton } from "@/features/auth/components/auth-states";
import { RequireRole } from "@/features/auth/components/guards";

function StaffPlaceholder() {
  return (
    <main id="main-content">
      <Container className="py-12">
        <Panel className="grid gap-4">
          <h1 className="m-0 text-2xl font-bold">بازبینی فروشگاه‌ها</h1>
          <p className="m-0 text-[var(--text-secondary)]">
            فضای Staff در Task Group بعدی تکمیل می‌شود.
          </p>
          <LogoutButton />
        </Panel>
      </Container>
    </main>
  );
}
export default function StaffReviewsPage() {
  return (
    <RequireRole role="staff">
      <StaffPlaceholder />
    </RequireRole>
  );
}
