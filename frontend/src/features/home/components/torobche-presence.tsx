"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "@/lib/motion";

export function TorobchePresence() {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0.75, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={motionTokens.emphasis}
      className="relative grid min-h-64 place-items-center overflow-hidden rounded-[var(--radius-stage)] border border-[var(--accent-radish-soft)] bg-[radial-gradient(circle,var(--accent-radish-soft),var(--surface-primary)_62%)]"
    >
      <div className="absolute inset-8 rounded-full border border-[var(--border-subtle)] opacity-60" />
      <div className="absolute inset-16 rounded-full border border-[var(--border-subtle)] opacity-40" />
      <motion.div
        animate={reducedMotion ? false : { y: [0, -6, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        className="relative grid justify-items-center gap-3"
      >
        <Image
          src="/icon.svg"
          alt="نشان موقت Torobche"
          width={112}
          height={112}
          className="size-28 rounded-[28px] shadow-[var(--shadow-level-3)]"
        />
        <span className="rounded-full bg-[var(--surface-primary)] px-4 py-2 text-sm font-semibold">
          آمادهٔ شنیدن نیاز تو
        </span>
      </motion.div>
    </motion.div>
  );
}
