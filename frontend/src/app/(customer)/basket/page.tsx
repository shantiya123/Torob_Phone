import { RequireRole } from "@/features/auth/components/guards";
import { BasketExperience } from "@/features/basket/components/basket-experience";

export default function BasketPage() {
  return (
    <RequireRole role="customer">
      <BasketExperience />
    </RequireRole>
  );
}
