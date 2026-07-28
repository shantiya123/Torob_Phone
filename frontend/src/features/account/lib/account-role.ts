export function getAccountRoleLabel(role: string | null | undefined): string {
  if (role === "customer") return "مشتری";
  if (role === "store") return "فروشگاه";
  if (role === "staff") return "کارشناس";
  return "نقش نامشخص";
}
