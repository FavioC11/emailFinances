export interface CategoryRule {
  name: string;
  keywords: string[];
}

export const DEFAULT_CATEGORY = "Sin categoría";

// Devuelve la primera categoría cuyas keywords hagan match con la contraparte.
export function categorize(
  counterparty: string | null | undefined,
  rules: CategoryRule[]
): string {
  if (!counterparty) return DEFAULT_CATEGORY;
  const text = counterparty.toLowerCase();
  for (const rule of rules) {
    if ((rule.keywords ?? []).some((k) => k && text.includes(k.toLowerCase()))) {
      return rule.name;
    }
  }
  return DEFAULT_CATEGORY;
}
