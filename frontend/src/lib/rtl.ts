export const rtlText = {
  direction: "rtl" as const,
  textStart: "text-start",
  textEnd: "text-end",
};

export function isolateBidi(value: string | number): string {
  return `\u2068${String(value)}\u2069`;
}
