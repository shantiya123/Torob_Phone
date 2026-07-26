import { RequireRole } from "@/features/auth/components/guards";
import { ShellPlaceholder } from "@/components/shell/shell-placeholder";

export default function OrdersPage() {
  return (
    <RequireRole role="customer">
      <ShellPlaceholder
        eyebrow="FE005 · مسیر آماده"
        title="سفارش‌ها"
        description="تاریخچه و جزئیات سفارش‌ها بعداً فقط بر اساس پاسخ واقعی backend نمایش داده می‌شود."
      />
    </RequireRole>
  );
}
