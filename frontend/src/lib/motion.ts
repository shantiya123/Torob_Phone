export const motionTokens = {
  instant: { duration: 0.08, ease: [0.2, 0.8, 0.2, 1] as const },
  fast: { duration: 0.14, ease: [0.2, 0.8, 0.2, 1] as const },
  standard: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] as const },
  layout: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const },
  emphasis: { duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
  scene: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
} as const;
