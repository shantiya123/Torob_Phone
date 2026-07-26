"use client";

import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "@/lib/motion";

export function HeroVisual() {
  const reducedMotion = useReducedMotion();
  const enter = reducedMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0, rotate: -2, transition: motionTokens.emphasis };

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto min-h-[330px] w-full max-w-[520px] overflow-hidden rounded-[var(--radius-stage)] border border-[var(--border-subtle)] bg-[radial-gradient(circle_at_70%_20%,rgb(232_62_79_/_24%),transparent_36%),linear-gradient(145deg,var(--surface-secondary),var(--page-background))] p-7 shadow-[var(--shadow-level-3)] sm:min-h-[430px]"
    >
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgb(255_255_255_/_5%)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_5%)_1px,transparent_1px)] [background-size:36px_36px]" />
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 24, rotate: 2 }}
        animate={enter}
        className="absolute inset-block-start-[12%] inset-inline-end-[12%] h-[72%] w-[42%] rounded-[38px] border border-[var(--border-strong)] bg-[var(--surface-primary)] p-2 shadow-[0_28px_70px_rgb(0_0_0_/_55%)]"
      >
        <div className="relative h-full overflow-hidden rounded-[30px] bg-[linear-gradient(160deg,var(--surface-elevated),var(--page-background))]">
          <div className="absolute inset-inline-start-1/2 inset-block-start-3 h-2 w-14 -translate-x-1/2 rounded-full bg-[var(--page-background)]" />
          <div className="absolute inset-x-5 inset-block-start-[24%] aspect-square rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--accent-radish),var(--accent-radish-deep)_48%,transparent_50%)] opacity-90" />
          <div className="absolute inset-x-5 inset-block-end-8 grid gap-2">
            <div className="h-2 rounded-full bg-[var(--border-strong)]" />
            <div className="h-2 w-2/3 rounded-full bg-[var(--border-subtle)]" />
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0, transition: { ...motionTokens.layout, delay: 0.12 } }}
        className="absolute inset-block-start-[18%] inset-inline-start-[7%] w-[48%] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[color:rgb(21_25_31_/_94%)] p-4 shadow-[var(--shadow-level-2)]"
      >
        <span className="text-xs text-[var(--text-muted)]">مدل دقیق</span>
        <div className="mt-3 h-3 w-4/5 rounded-full bg-[var(--text-secondary)]" />
        <div className="mt-2 h-2 w-2/3 rounded-full bg-[var(--border-strong)]" />
      </motion.div>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0, transition: { ...motionTokens.layout, delay: 0.22 } }}
        className="absolute inset-block-end-[14%] inset-inline-start-[3%] w-[54%] rounded-[var(--radius-card)] border border-[var(--accent-radish-soft)] bg-[color:rgb(21_25_31_/_96%)] p-4 shadow-[var(--shadow-level-2)]"
      >
        <span className="text-xs text-[var(--text-muted)]">پیشنهادهای فروشگاه‌ها</span>
        <div className="mt-3 flex items-center gap-2">
          <span className="size-3 rounded-full bg-[var(--accent-radish)]" />
          <div className="h-2 flex-1 rounded-full bg-[var(--border-strong)]" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="size-3 rounded-full bg-[var(--text-muted)]" />
          <div className="h-2 w-3/4 rounded-full bg-[var(--border-subtle)]" />
        </div>
      </motion.div>
    </div>
  );
}
