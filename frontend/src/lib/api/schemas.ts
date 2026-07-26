import { z } from "zod";

export const accessTokenSchema = z.object({ access: z.string().min(1) }).strict();
export const currentUserSchema = z
  .object({
    id: z.number().int().positive(),
    username: z.string(),
    email: z.string(),
    is_staff: z.boolean(),
    is_superuser: z.boolean(),
    account_type: z.enum(["customer", "store"]).nullable(),
    created_at: z.string().nullable(),
  })
  .strict();
export const moneySchema = z.number().int().safe();
export const nonNegativeMoneySchema = moneySchema.nonnegative();

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z
    .object({
      count: z.number().int().nonnegative(),
      next: z.string().url().nullable(),
      previous: z.string().url().nullable(),
      results: z.array(item),
    })
    .strict();
}

export const publicStoreSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    slug: z.string(),
    logo: z.string().nullable(),
  })
  .strict();

export const walletSchema = z
  .object({
    id: z.number().int().positive(),
    balance: nonNegativeMoneySchema,
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

const orderSummarySchema = z
  .object({
    id: z.number().int().positive(),
    status: z.enum(["pending", "paid", "cancelled", "completed"]),
    store: z.object({ id: z.number().int().positive(), name: z.string() }).passthrough(),
    item_count: z.number().int().nonnegative(),
    total: nonNegativeMoneySchema,
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const checkoutSchema = z
  .object({
    checkout_id: z.string().min(1),
    orders: z.array(orderSummarySchema),
    order_count: z.number().int().nonnegative(),
    total: nonNegativeMoneySchema,
    wallet_balance: nonNegativeMoneySchema,
  })
  .strict();

export function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error("invalid_api_response");
  return result.data;
}
