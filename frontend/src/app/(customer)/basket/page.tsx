import { RequireRole } from "@/features/auth/components/guards";
import { ShellPlaceholder } from "@/components/shell/shell-placeholder";

export default function BasketPage() {
  return (
    <RequireRole role="customer">
      <ShellPlaceholder
        eyebrow="FE005 · مسیر آماده"
        title="سبد خرید"
        description="سبد خرید در Task Group مربوط به خرید و Checkout با قراردادهای واقعی backend ساخته می‌شود."
      />
    </RequireRole>
  );
}
