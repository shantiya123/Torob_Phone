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
