// Human, natural dollar formatting — always two decimals, with thousands
// separators (e.g. 10 → "10.00", 1234.5 → "1,234.50"). Never one decimal.
export function money(n: number | null | undefined): string {
  const v = Number.isFinite(n as number) ? (n as number) : 0;
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
