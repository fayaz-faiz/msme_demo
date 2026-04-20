export enum OndcCategory {
  GROCERY = "ONDC:RET10",
  ELECTRONICS = "ONDC:RET14",
  FASHION = "ONDC:RET12",
  "F&B" = "ONDC:RET11",
}

const CATEGORY_MAP: Record<string, string> = {
  grocery: OndcCategory.GROCERY,
  electronics: OndcCategory.ELECTRONICS,
  fashion: OndcCategory.FASHION,
  "f&b": OndcCategory["F&B"],
  fnb: OndcCategory["F&B"],
  "food & beverage": OndcCategory["F&B"],
  "food and beverage": OndcCategory["F&B"],
};

export const toOndcCategory = (category: string): string => {
  const normalized = category.toLowerCase().trim();
  return CATEGORY_MAP[normalized] ?? category;
};
