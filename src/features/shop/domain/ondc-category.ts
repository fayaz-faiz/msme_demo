export enum OndcCategory {
  GROCERY = "ONDC:RET10",
  ELECTRONICS = "ONDC:RET14",
  FASHION = "ONDC:RET12",
  BEAUTY_AND_PERSONAL_CARE = "ONDC:RET13",
  "F&B" = "ONDC:RET11",
}

const CATEGORY_MAP: Record<string, string> = {
  grocery: OndcCategory.GROCERY,
  appliances: "ONDC:RET15",
  "home & kitchen": "ONDC:RET16",
  "home and kitchen": "ONDC:RET16",
  electronics: OndcCategory.ELECTRONICS,
  fashion: OndcCategory.FASHION,
  "beauty & personal care": OndcCategory.BEAUTY_AND_PERSONAL_CARE,
  "beauty and personal care": OndcCategory.BEAUTY_AND_PERSONAL_CARE,
  beauty: OndcCategory.BEAUTY_AND_PERSONAL_CARE,
  "f&b": OndcCategory["F&B"],
  fnb: OndcCategory["F&B"],
  "food & beverage": OndcCategory["F&B"],
  "food and beverage": OndcCategory["F&B"],
};

export const toOndcCategory = (category: string): string => {
  const normalized = category.toLowerCase().trim();
  return CATEGORY_MAP[normalized] ?? category;
};
