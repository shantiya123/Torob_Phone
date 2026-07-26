import { RequireRole } from "@/features/auth/components/guards";
import { ShellPlaceholder } from "@/components/shell/shell-placeholder";

export default function WalletPage() {
  return (
    <RequireRole role="customer">
      <ShellPlaceholder
        eyebrow="FE005 · مسیر آماده"
        title="کیف پول"
        description="نمایش موجودی و تراکنش‌های واقعی در Task Group کیف پول پیاده‌سازی می‌شود."
      />
    </RequireRole>
  );
}
