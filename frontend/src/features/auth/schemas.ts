import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "نام کاربری را وارد کنید."),
  password: z.string().min(1, "رمز عبور را وارد کنید."),
});

export const customerRegistrationSchema = z
  .object({
    username: z.string().min(1, "نام کاربری را وارد کنید.").max(150),
    email: z.string().email("ایمیل معتبر وارد کنید."),
    password: z.string().min(1, "رمز عبور را وارد کنید."),
    password_confirm: z.string().min(1, "تکرار رمز عبور را وارد کنید."),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "تکرار رمز عبور یکسان نیست.",
    path: ["password_confirm"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type CustomerRegistrationFormValues = z.infer<typeof customerRegistrationSchema>;

const optionalText = z.string().trim();

export const storeRegistrationSchema = z
  .object({
    username: z.string().trim().min(1, "نام کاربری را وارد کنید.").max(150),
    email: z.string().trim().email("ایمیل معتبر وارد کنید."),
    password: z.string().min(1, "رمز عبور را وارد کنید."),
    password_confirm: z.string().min(1, "تکرار رمز عبور را وارد کنید."),
    store: z.object({
      name: z.string().trim().min(1, "نام فروشگاه را وارد کنید.").max(255),
      description: optionalText,
      business_phone: z.string().trim().min(1, "شماره تماس فروشگاه را وارد کنید.").max(32),
      business_email: z.union([z.literal(""), z.string().trim().email("ایمیل فروشگاه معتبر نیست.")]),
      address: z.string().trim().min(1, "نشانی فروشگاه را وارد کنید."),
    }),
    legal_profile: z.object({
      legal_name: z.string().trim().min(1, "نام قانونی را وارد کنید.").max(255),
      business_type: z.string().trim().min(1, "نوع کسب‌وکار را وارد کنید.").max(100),
      business_registration_number: optionalText,
      national_identifier: optionalText,
      tax_identifier: optionalText,
      legal_representative_name: z.string().trim().min(1, "نام نماینده قانونی را وارد کنید.").max(255),
      legal_representative_national_identifier: optionalText,
    }),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "تکرار رمز عبور یکسان نیست.",
    path: ["password_confirm"],
  });

export type StoreRegistrationFormValues = z.input<typeof storeRegistrationSchema>;
