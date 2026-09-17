export const formFieldBase =
  "w-full rounded-lg px-3 text-sm " +
  "bg-input text-foreground " +
  "border border-[var(--gauge-well-border)] " +
  "shadow-[var(--shadow-well)] " +
  "placeholder:text-muted-foreground " +
  "transition-[border-color,box-shadow] duration-150 ease-out " +
  "hover:border-border " +
  "focus-visible:outline-none focus-visible:border-[var(--gauge-rim)] " +
  "focus-visible:shadow-[var(--shadow-well),var(--shadow-focus)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const formFieldSingleLine = "flex h-9 py-1.5";
export const formFieldMultiLine = "flex min-h-20 py-2";
