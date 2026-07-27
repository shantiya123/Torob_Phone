"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { motionTokens } from "@/lib/motion";
import type { TorobcheCharacterState } from "../types";

const stateLabels: Record<TorobcheCharacterState, string> = {
  idle: "آماده‌ام نیازت را بشنوم",
  focused: "دارم گوش می‌دهم",
  thinking: "در حال بررسی درخواست شما",
  results: "نتیجه‌ها آماده‌اند",
  empty: "بیایید جست‌وجو را دقیق‌تر کنیم",
  error: "می‌توانیم دوباره امتحان کنیم",
  recovery: "نتیجه‌ها با یک هشدار آماده‌اند",
};

export function TorobcheCharacter({
  state,
  compact = false,
}: {
  state: TorobcheCharacterState;
  compact?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const thinking = state === "thinking";
  return (
    <motion.div
      data-character-state={state}
      layout={!reducedMotion}
      transition={motionTokens.layout}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-[var(--radius-stage)] border border-[var(--border-subtle)] bg-[radial-gradient(circle_at_50%_35%,var(--surface-elevated),var(--surface-secondary)_68%)]",
        compact ? "min-h-28 w-full sm:w-44" : "min-h-64 w-full sm:min-h-80",
      )}
    >
      <motion.div
        aria-hidden="true"
        {...(!reducedMotion
          ? {
              animate: thinking
                ? { y: [0, -5, 0], rotate: [0, 2, 0] }
                : state === "idle"
                  ? { y: [0, -8, 0] }
                  : { scale: state === "focused" ? 1.06 : 1 },
            }
          : {})}
        transition={
          thinking || state === "idle"
            ? { duration: thinking ? 2 : 2.8, repeat: Infinity, ease: "easeInOut" }
            : motionTokens.standard
        }
        className={cn(
          "relative grid place-items-center rounded-full border border-[var(--accent-radish)]/30 bg-[var(--accent-radish-soft)]/35 shadow-[0_0_48px_rgb(232_62_79/0.16)]",
          compact ? "size-16" : "size-32 sm:size-40",
        )}
      >
        <Image
          src="/icon.svg"
          alt=""
          width={compact ? 48 : 96}
          height={compact ? 48 : 96}
          className="rounded-2xl"
        />
      </motion.div>
      <p className="absolute inset-x-4 bottom-4 m-0 text-center text-sm text-[var(--text-secondary)]">
        {stateLabels[state]}
      </p>
    </motion.div>
  );
}
