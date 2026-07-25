# Torob Phone Content Guidelines

**Status:** Approved content direction  
**Language:** Persian, RTL  
**Product concept:** The Living Lens  
**Voice:** Clear, warm, precise, honest

## 1. Purpose

These guidelines keep the words, labels, messages, and metadata consistent across the web and mobile frontend.

The frontend presents two kinds of content:

1. **Backend-controlled content** — AI-generated Torobche messages, returned explanations, product data, Store data, prices, availability, statuses, and errors.
2. **Frontend-controlled interface copy** — labels, navigation, loading, reset, retry, accessibility announcements, and predictable UI states.

The frontend may style and animate backend content, but must not rewrite its meaning or invent claims.

## 2. Voice principles

### Clear before clever

Users should understand the action or state on the first reading.

### Warm without childishness

Torobche can be friendly and playful. Commerce, wallet, order, Store, and Staff copy must remain mature and precise.

### Short and natural

Prefer ordinary Persian sentences over formal bureaucratic language or excessive slang.

### Honest about uncertainty

If the backend did not understand, apply, return, charge, reserve, approve, or confirm something, the interface must say so.

### Action-oriented

Every empty, warning, or error state should offer the most relevant next action.

## 3. Persian language rules

- Use Persian punctuation and natural RTL sentence order.
- Use Persian numerals in explanatory labels when appropriate; keep technical values and IDs unambiguous.
- Keep Latin model names, storage standards, URLs, and identifiers readable inside RTL layouts.
- Use consistent terms for RAM, storage, price, stock, Store, Offer, Basket, and order.
- Avoid unnecessary English UI labels when a clear Persian equivalent exists.
- Do not translate model names, brand names, SKUs, API codes, or backend enum values into ambiguous alternatives.
- Use `گیگابایت`, `میلیون`, `فروشگاه`, `پیشنهاد فروش`, `سبد خرید`, `کیف پول`, and `سفارش` consistently.

## 4. Torobche content

### Backend-controlled speech

The main Torobche response is the Persian `message` returned by Django. Display it as text. Do not prepend a fabricated interpretation or rewrite it into a frontend template.

The same rule applies to contextual explanations returned by the backend.

### Frontend-controlled speech

The frontend may own:

- first-entry greeting;
- input placeholder;
- loading status;
- retry;
- reset/new-search labels;
- authentication and role-denial copy;
- accessibility announcements;
- generic network/server failure copy.

Recommended first greeting:

> سلام! نیازت به گوشی رو بگو تا دقیق‌تر پیداش کنیم.

Recommended placeholder:

> مثلاً: گوشی سامسونگ برای بازی با باتری خوب

### Torobche personality

Use short, attentive, slightly playful language:

- “بذار بررسی کنم.”
- “نتیجه‌ها رو به‌روزرسانی کردم.”
- “این بخش از درخواستت کامل قابل تفسیر نبود.”

Avoid:

- exaggerated claims such as “بهترین گوشی دنیا”;
- fake certainty;
- childish jokes during payment or errors;
- pretending to hear audio when voice input is not implemented;
- claiming a filter was applied before the backend confirms it.

## 5. QuerySet language

The QuerySet surface represents backend-confirmed state.

Use labels such as:

```text
جستجوی فعلی
تربچه الان این موارد را بررسی می‌کند
برند
حداقل رم
فضای ذخیره‌سازی
ترتیب نمایش
```

Do not call a chip “applied” unless the returned QuerySet confirms it.

When a field changes:

> جستجو به‌روزرسانی شد.

If a requested detail was not applied:

> این بخش از درخواستت در جستجوی فعلی اعمال نشد.

Use the backend warning when provided instead of inventing a reason.

## 6. Loading, warning, and error copy

### Loading

Use short status text:

> دارم بررسی می‌کنم…

For long waits:

> هنوز دارم نتیجه‌ها رو بررسی می‌کنم.

Do not show fake detailed progress or imply a specific AI operation that the backend did not report.

### Provider fallback

> تفسیر هوشمند درخواستت در دسترس نبود، اما با اطلاعات موجود جستجو رو ادامه دادم.

### Empty results

> با این ترکیب نتیجه‌ای پیدا نکردم. درخواستت رو تغییر بده تا دوباره بررسی کنم.

### Validation error

> این درخواست با قالب جستجو هماهنگ نبود. متن رو نگه داشتم؛ دوباره امتحان کن.

### Network failure

> ارتباط با سرور برقرار نشد. اتصال رو بررسی کن و دوباره امتحان کن.

### Generic server failure

> تربچه نتونست جستجو رو کامل کنه. درخواستت باقی مونده؛ دوباره امتحان کن.

### Context required

> برای دریافت توضیح تربچه، اول یک جستجو انجام بده.

Errors should be placed near the affected action and announced through an accessible live region when asynchronous.

## 7. Navigation and action labels

Use direct labels:

```text
شروع گفتگو با تربچه
مشاهده فروشگاه‌ها
مشاهده جزئیات
مشاهده پیشنهادها
افزودن به سبد
مشاهده سبد خرید
ادامه خرید
تأیید خرید و پرداخت از کیف پول
مشاهده سفارش
مشاهده همه سفارش‌ها
ویرایش پیشنهاد
ایجاد پیشنهاد فروش
ذخیره تغییرات
حذف پیشنهاد
شروع جستجوی جدید
پاک کردن جستجو
تلاش دوباره
بازگشت
خروج از حساب
```

Avoid vague labels such as “ادامه”, “انجام شد”, or “کلیک کنید” when a more specific action is possible.

## 8. Product and Variant content

Always distinguish:

```text
مدل/گوشی والد
گونه دقیق / DeviceVariant
```

Use exact identity:

```text
Samsung Galaxy M47
رم ۸ گیگابایت
حافظه ۱۲۸ گیگابایت
```

Omit unavailable specifications. Do not write “اطلاعات کامل” when fields are missing.

Image alt text should identify the available product context without claiming that a parent image proves exact color or configuration:

> تصویر Samsung Galaxy M47

## 9. Offer and Store content

An Offer is a Store’s purchasable presentation of one exact Variant.

Use:

```text
پیشنهاد فروش
قیمت
موجودی
موجود
ناموجود
توضیحات فروشگاه
فروشگاه
```

Do not add:

- seller rating;
- trust score;
- discount;
- delivery estimate;
- popularity;
- price guidance unless returned by Django.

Public Store content must use only approved public fields. Do not expose legal, private, review, rejection, or internal Staff information.

## 10. Basket and checkout content

Basket language should make reservation and exact identity clear:

> این پیشنهاد به سبد خرید اضافه شد.

For stock or quantity errors:

> موجودی این پیشنهاد برای این تعداد کافی نیست.

Checkout must state the financial action:

> تأیید خرید و پرداخت از کیف پول

Do not say “پرداخت موفق” unless Django has actually completed and confirmed wallet/payment behavior.

For multiple Store orders:

> سفارش‌ها برای هر فروشگاه جداگانه ثبت شدند.

## 11. Wallet and order content

Wallet:

```text
موجودی کیف پول
تراکنش‌ها
خرید
شارژ
بازپرداخت
```

If charging is not supported:

> شارژ کیف پول هنوز در دسترس نیست.

Orders should use backend status mappings consistently:

```text
در انتظار
پرداخت‌شده
لغوشده
تکمیل‌شده
```

Do not infer a status from frontend timing or color.

## 12. Store and Staff content

### Store

Use operational language:

```text
وضعیت فروشگاه
کاتالوگ گوشی‌ها
پیشنهادهای من
پروفایل فروشگاه
مشاهده فروشگاه عمومی
```

Pending registration:

> اطلاعات فروشگاه برای بررسی ارسال شده است.

### Staff

Use evidence-led language:

```text
بررسی فروشگاه‌ها
اطلاعات ثبت‌نام
تأیید فروشگاه
رد درخواست
دلیل رد
```

Never show approval or rejection as successful until Django confirms it.

## 13. Empty states

Every empty state explains the real condition and offers one relevant action.

Examples:

```text
هنوز فروشگاهی برای نمایش وجود ندارد.
پیشنهاد فعالی برای این فروشگاه پیدا نشد.
سبد خریدت خالی است.
هنوز سفارشی ثبت نکرده‌ای.
تراکنشی برای نمایش وجود ندارد.
نتیجه‌ای برای این جستجو پیدا نشد.
پیشنهاد فروشی ثبت نکرده‌ای.
درخواست بررسی‌ای برای نمایش وجود ندارد.
```

Do not use generic “Oops” language or blame the user.

## 14. SEO and metadata

Public metadata must use real backend data:

```text
Samsung Galaxy M47 8GB/128GB | Torob Phone
Mobile Center | Torob Phone
Offers from Mobile Center | Torob Phone
```

Do not place private Store data, account information, internal statuses, or unsupported claims in metadata. Authentication, Customer, Store workspace, and Staff pages should not be indexed.

## 15. Accessibility content

- Every input has a visible or programmatically associated Persian label.
- Buttons describe the action, not the icon.
- Async loading and mutation status use live regions.
- Error text identifies the affected field or operation.
- Status is written as text and not conveyed only through red/green.
- Alt text describes the available image without inventing unsupported detail.
- Long AI responses remain available as complete text even when visually revealed in phrases.

## 16. Content anti-patterns

Avoid:

- raw JSON;
- vague buttons;
- fake AI certainty;
- unsupported claims;
- untranslated backend errors;
- excessive slang;
- repetitive “loading” text;
- marketing superlatives without evidence;
- promises about wallet, delivery, stock, or approval;
- hiding important errors in toasts only;
- changing backend-generated Torobche meaning.

## 17. Content review checklist

Before release, verify:

- Persian RTL reading order;
- consistent terminology;
- backend message preserved;
- no unsupported claim;
- exact Variant identity visible;
- Store and Offer relationship clear;
- error and empty next actions useful;
- metadata uses real data;
- screen-reader text is meaningful;
- mobile labels fit without harmful truncation.
