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

export const publicStoreDetailSchema = publicStoreSchema
  .extend({
    description: z.string().nullable(),
    created_at: z.string(),
  })
  .strict();

export const compactVariantSchema = z
  .object({
    id: z.number().int().positive(),
    brand: z.string(),
    model_name: z.string(),
    device_kind: z.string(),
    image_url: z.string().nullable(),
    storage_gb: z.number().int().nonnegative().nullable(),
    ram_gb: z.number().int().nonnegative().nullable(),
    storage_technology: z.string().nullable(),
    is_available: z.boolean(),
  })
  .strict();

const numericRangeSchema = z
  .object({ min: z.number().nonnegative().nullable(), max: z.number().nonnegative().nullable() })
  .strict();

export const torobcheQuerySetSchema = z
  .object({
    brand: z.string().nullable(),
    model: z.string().nullable(),
    release_date: z.string().nullable(),
    source: z.object({ name: z.string().nullable(), url: z.string().nullable() }).strict(),
    performance: z
      .object({
        chipset: z.string().nullable(),
        cpu: z.string().nullable(),
        gpu: z.string().nullable(),
        storage_type: z.string().nullable(),
        variants: z.object({ ram_gb: numericRangeSchema, storage_gb: numericRangeSchema }).strict(),
      })
      .strict(),
    display: z
      .object({
        size_inches: numericRangeSchema,
        resolution_width: numericRangeSchema,
        resolution_height: numericRangeSchema,
        technology: z.string().nullable(),
        refresh_rate_hz: numericRangeSchema,
        brightness_peak_nits: numericRangeSchema,
        hdr: z.boolean().nullable(),
      })
      .strict(),
    battery: z
      .object({
        capacity_mah: numericRangeSchema,
        charging_w: numericRangeSchema,
        wireless_charging: z.boolean().nullable(),
      })
      .strict(),
    camera: z
      .object({
        main_mp: numericRangeSchema,
        ultrawide_mp: numericRangeSchema,
        macro_mp: numericRangeSchema,
        selfie_mp: numericRangeSchema,
        ois: z.boolean().nullable(),
        video_max_resolution: z.string().nullable(),
        video_max_fps: numericRangeSchema,
      })
      .strict(),
    connectivity: z
      .object({
        "5g": z.boolean().nullable(),
        wifi_version: z.string().nullable(),
        bluetooth_version: z.string().nullable(),
        nfc: z.boolean().nullable(),
      })
      .strict(),
    physical: z.object({ weight_g: numericRangeSchema, ip_rating: z.string().nullable() }).strict(),
    software: z
      .object({
        os: z.string().nullable(),
        android_version: numericRangeSchema,
        major_updates: numericRangeSchema,
      })
      .strict(),
    benchmarks: z
      .object({
        antutu: numericRangeSchema,
        geekbench: numericRangeSchema,
        "3dmark": numericRangeSchema,
      })
      .strict(),
    price: numericRangeSchema,
  })
  .strict();

export const torobcheResultSchema = compactVariantSchema
  .extend({ minimum_available_price: nonNegativeMoneySchema.nullable() })
  .strict();

export const torobcheSearchResponseSchema = z
  .object({
    message: z.string(),
    queryset: torobcheQuerySetSchema,
    query_set: torobcheQuerySetSchema,
    count: z.number().int().nonnegative(),
    next: z.string().url().nullable(),
    previous: z.string().url().nullable(),
    results: z.array(torobcheResultSchema),
    ordering: z.enum([
      "price_asc",
      "price_desc",
      "newest",
      "oldest",
      "battery_high",
      "battery_low",
    ]),
    warning: z.string().nullable().optional(),
    warning_code: z.string().nullable().optional(),
  })
  .strict();

export const torobcheStateResponseSchema = z
  .object({
    queryset: torobcheQuerySetSchema,
    query_set: torobcheQuerySetSchema.optional(),
    has_active_filters: z.boolean(),
    updated_at: z.string().nullable(),
  })
  .strict();

export const torobcheResetResponseSchema = z
  .object({
    message: z.string(),
    queryset: torobcheQuerySetSchema,
    query_set: torobcheQuerySetSchema.optional(),
  })
  .strict();

export const personalizedExplanationSchema = z
  .object({
    phone_id: z.number().int().positive(),
    description: z.string().nullable(),
    error: z.string().nullable().optional(),
    code: z.string().optional(),
    detail: z.string().optional(),
  })
  .strict();

const optionalSpecificationSchema = z.record(z.string(), z.unknown()).nullable();

export const deviceVariantDetailSchema = compactVariantSchema
  .extend({
    announced_on: z.string().nullable(),
    released_on: z.string().nullable(),
    sku_or_region: z.string().nullable(),
    performance: optionalSpecificationSchema,
    displays: z.array(z.record(z.string(), z.unknown())).default([]),
    battery: optionalSpecificationSchema,
    cameras: z.array(z.record(z.string(), z.unknown())).default([]),
    connectivity: optionalSpecificationSchema,
    physical: optionalSpecificationSchema,
    software: optionalSpecificationSchema,
    benchmarks: z.array(z.record(z.string(), z.unknown())).default([]),
  })
  .strict();

export const publicOfferSchema = z
  .object({
    id: z.number().int().positive(),
    device_variant: compactVariantSchema,
    store: publicStoreSchema,
    price: z.number().int().positive().safe(),
    quantity: z.number().int().nonnegative(),
    available: z.boolean(),
    description: z.string().nullable(),
  })
  .strict();

export const publicOfferDetailSchema = publicOfferSchema
  .extend({
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

export const operationalOfferSchema = z
  .object({
    id: z.number().int().positive(),
    device_variant: compactVariantSchema,
    store: publicStoreSchema,
    price: z.number().int().positive().safe(),
    quantity: z.number().int().nonnegative(),
    publicly_available: z.boolean(),
    availability_reason: z
      .enum([
        "store_not_active",
        "out_of_stock",
        "variant_unavailable",
        "device_not_catalog_eligible",
      ])
      .nullable(),
    updated_at: z.string(),
  })
  .strict();

export const operationalOfferListSchema = paginatedSchema(operationalOfferSchema);

export const walletSchema = z
  .object({
    id: z.number().int().positive(),
    balance: nonNegativeMoneySchema,
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

export const orderSummarySchema = z
  .object({
    id: z.number().int().positive(),
    status: z.enum(["pending", "paid", "cancelled", "completed"]),
    store: z.object({ id: z.number().int().positive(), name: z.string() }).strict(),
    item_count: z.number().int().nonnegative(),
    total: nonNegativeMoneySchema,
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

export const orderListSchema = paginatedSchema(orderSummarySchema);

export const orderVariantSchema = z
  .object({
    id: z.number().int().positive(),
    brand: z.string(),
    model: z.string(),
    image_url: z.string().nullable(),
    ram_gb: z.number().int().nonnegative(),
    storage_gb: z.number().int().nonnegative(),
    storage_technology: z.string(),
  })
  .strict();

export const orderItemSchema = z
  .object({
    id: z.number().int().positive(),
    offer: z.number().int().positive(),
    variant: orderVariantSchema,
    quantity: z.number().int().positive(),
    unit_price: nonNegativeMoneySchema,
    line_total: nonNegativeMoneySchema,
    created_at: z.string(),
  })
  .strict();

export const orderDetailSchema = orderSummarySchema
  .extend({ items: z.array(orderItemSchema) })
  .strict();

export const walletTransactionSchema = z
  .object({
    id: z.number().int().positive(),
    amount: z.number().int(),
    balance_after: nonNegativeMoneySchema,
    transaction_type: z.enum(["charge", "purchase", "refund"]),
    order: z.number().int().positive().nullable(),
    created_at: z.string(),
  })
  .strict();


export const walletTransactionListSchema = paginatedSchema(walletTransactionSchema);

export const walletChargeResponseSchema = z
  .object({ wallet: walletSchema, transaction: walletTransactionSchema })
  .strict();

export const orderCancellationResponseSchema = z
  .object({
    order: orderDetailSchema,
    stock_restored: z.boolean(),
    refund: walletTransactionSchema.nullable(),
    refund_created: z.boolean(),
    wallet_balance: nonNegativeMoneySchema.nullable(),
  })
  .strict();

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

export const basketItemSchema = z
  .object({
    id: z.number().int().positive(),
    offer: publicOfferSchema,
    quantity: z.number().int().positive(),
    unit_price: nonNegativeMoneySchema,
    total: nonNegativeMoneySchema,
    expires_at: z.string(),
    remaining_seconds: z.number().int().nonnegative(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

export const basketSchema = z
  .object({
    id: z.number().int().positive(),
    items: z.array(basketItemSchema),
    total: nonNegativeMoneySchema,
    next_expiration_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();


export const storeCatalogPhoneSchema = z
  .object({
    id: z.number().int().positive(),
    brand: z.string(),
    model: z.string(),
    image_url: z.string().nullable(),
    release_date: z.string().nullable(),
  })
  .strict();

export const storeCatalogVariantSchema = compactVariantSchema
  .extend({
    owned_offer: z
      .object({
        id: z.number().int().positive(),
        price: moneySchema,
        quantity: z.number().int().nonnegative(),
        publicly_available: z.boolean(),
        updated_at: z.string(),
      })
      .strict()
      .nullable(),
    market: z
      .object({
        offer_count: z.number().int().nonnegative(),
        lowest_price: nonNegativeMoneySchema.nullable(),
        highest_price: nonNegativeMoneySchema.nullable(),
      })
      .strict(),
  })
  .strict();

export const storeCatalogPhoneDetailSchema = storeCatalogPhoneSchema
  .extend({ variants: z.array(storeCatalogVariantSchema) })
  .strict();

export const storeDashboardSchema = z.discriminatedUnion("operational_access", [
  z
    .object({
      store: z
        .object({
          id: z.number().int().positive(),
          name: z.string(),
          slug: z.string(),
          logo: z.string().nullable(),
          status: z.enum(["pending", "active", "rejected", "suspended"]),
          rejection_reason: z.string(),
        })
        .strict(),
      generated_at: z.string(),
      operational_access: z.literal(false),
      reason: z.literal("store_not_active"),
      offers: z.null(),
      orders: z.null(),
      recent_orders: z.array(z.unknown()),
      recent_offers: z.array(z.unknown()),
    })
    .strict(),
  z
    .object({
      store: z
        .object({
          id: z.number().int().positive(),
          name: z.string(),
          slug: z.string(),
          logo: z.string().nullable(),
          status: z.literal("active"),
          rejection_reason: z.string(),
        })
        .strict(),
      generated_at: z.string(),
      operational_access: z.literal(true),
      reason: z.null(),
      offers: z
        .object({
          total: z.number().int().nonnegative(),
          publicly_available: z.number().int().nonnegative(),
          out_of_stock: z.number().int().nonnegative(),
          unavailable_variant: z.number().int().nonnegative(),
          reserved_units: z.number().int().nonnegative(),
          total_available_units: z.number().int().nonnegative(),
        })
        .strict(),
      orders: z
        .object({
          paid: z.number().int().nonnegative(),
          completed: z.number().int().nonnegative(),
          cancelled: z.number().int().nonnegative(),
          open: z.number().int().nonnegative(),
        })
        .strict(),
      recent_orders: z.array(z.unknown()),
      recent_offers: z.array(z.unknown()),
    })
    .strict(),
]);

export const createdOfferResponseSchema = z
  .object({
    id: z.number().int().positive(),
    device_variant: z.number().int().positive(),
    price: moneySchema.positive(),
    quantity: z.number().int().nonnegative(),
    description: z.string().nullable(),
  })
  .strict();

export const storeRegistrationResponseSchema = z
  .object({
    id: z.number().int().positive(),
    username: z.string(),
    email: z.string().email(),
    account_type: z.literal("store"),
    store: z
      .object({
        id: z.number().int().positive(),
        name: z.string(),
        slug: z.string(),
        status: z.enum(["pending", "active", "rejected", "suspended"]),
      })
      .strict(),
  })
  .strict();
