import { notFound } from "next/navigation";
import { UiGallery } from "@/components/ui/ui-gallery";

export default function UiDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiGallery />;
}
