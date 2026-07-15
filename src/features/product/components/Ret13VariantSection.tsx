"use client";

import styles from "./Ret13VariantSection.module.css";

type ApiProductItem = {
  _id?: string;
  item_id?: string;
  item_measure_value?: string | number;
  item_measure_quantity?: string;
  color?: string;
  color_name?: string;
  colour?: string;
  colour_name?: string;
  item_name?: string;
  parent_item_id?: string;
  brand?: string;
};

type Ret13VariantSectionProps = {
  details: ApiProductItem;
  variants: ApiProductItem[];
  activeItemId: string;
  onSelectVariant: (variantId: string) => void;
};

type OptionEntry = {
  key: string;
  label: string;
};

const normalizeValue = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeLoose = (value?: string | null) =>
  normalizeValue(value).replace(/[^a-z0-9]+/g, "");

const isMeaningful = (value?: string | null) => {
  const normalized = normalizeValue(value);
  return Boolean(normalized && normalized !== "na" && normalized !== "-");
};

const getItemId = (item: ApiProductItem | null | undefined) =>
  String(item?._id || item?.item_id || "").trim();

const getMeasureLabel = (variant: ApiProductItem) => {
  const value = String(variant.item_measure_value ?? "").trim();
  const quantity = String(variant.item_measure_quantity ?? "").trim();
  return [value, quantity].filter(Boolean).join(" ") || "One size";
};

const getMeasureKey = (variant: ApiProductItem) =>
  normalizeLoose(getMeasureLabel(variant));

const getColorLabel = (variant: ApiProductItem) => {
  const label =
    (isMeaningful(variant.color_name) && variant.color_name) ||
    (isMeaningful(variant.colour_name) && variant.colour_name) ||
    (isMeaningful(variant.color) && variant.color) ||
    (isMeaningful(variant.colour) && variant.colour) ||
    "";
  return String(label).trim();
};

const getColorKey = (variant: ApiProductItem) =>
  normalizeLoose(getColorLabel(variant));

const getColorValue = (variant: ApiProductItem) =>
  String(variant.color || variant.colour || "").trim();

const uniqueOptions = (
  variants: ApiProductItem[],
  getKey: (variant: ApiProductItem) => string,
  getLabel: (variant: ApiProductItem) => string,
): OptionEntry[] => {
  const seen = new Set<string>();
  const options: OptionEntry[] = [];

  variants.forEach((variant) => {
    const key = getKey(variant);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    options.push({
      key,
      label: getLabel(variant),
    });
  });

  return options;
};

const findVariantByFilters = (
  variants: ApiProductItem[],
  filters: {
    measureKey?: string;
    colorKey?: string;
  },
) => {
  const exactMatch = variants.find((variant) => {
    const measureMatch = filters.measureKey ? getMeasureKey(variant) === filters.measureKey : true;
    const colorMatch = filters.colorKey ? getColorKey(variant) === filters.colorKey : true;
    return measureMatch && colorMatch;
  });
  if (exactMatch) {
    return exactMatch;
  }

  const measureMatch = filters.measureKey
    ? variants.find((variant) => getMeasureKey(variant) === filters.measureKey)
    : null;
  if (measureMatch) {
    return measureMatch;
  }

  const colorMatch = filters.colorKey
    ? variants.find((variant) => getColorKey(variant) === filters.colorKey)
    : null;
  if (colorMatch) {
    return colorMatch;
  }

  return variants[0] || null;
};

export function Ret13VariantSection({
  details,
  variants,
  activeItemId,
  onSelectVariant,
}: Ret13VariantSectionProps) {
  const selectedVariant =
    variants.find((variant) => getItemId(variant) === activeItemId) || details;

  const selectedMeasureKey = selectedVariant ? getMeasureKey(selectedVariant) : "";
  const selectedColorKey = selectedVariant ? getColorKey(selectedVariant) : "";

  const measureOptions = uniqueOptions(variants, getMeasureKey, getMeasureLabel);
  const colorOptions = uniqueOptions(variants, getColorKey, getColorLabel);

  if (measureOptions.length === 0 && colorOptions.length === 0) {
    return null;
  }

  return (
    <section className={styles.ret13Panel} aria-label="Available colors and measures">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Choose variant</h2>
          {/* <p className={styles.subtext}>
            Pick a measure and a color. Matching variants will update together.
          </p> */}
        </div>
      </div>

      {measureOptions.length > 0 ? (
        <div className={styles.optionBlock}>
          {/* <span className={styles.optionLabel}>Measure</span> */}
          <div className={styles.chipRow}>
            {measureOptions.map((option) => {
              const selected = option.key === selectedMeasureKey;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`${styles.measureChip} ${selected ? styles.measureChipSelected : ""}`}
                  onClick={() => {
                    const nextVariant = findVariantByFilters(variants, {
                      measureKey: option.key,
                      colorKey: selectedColorKey || undefined,
                    });
                    const nextId = getItemId(nextVariant);
                    if (nextId) {
                      onSelectVariant(nextId);
                    }
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {colorOptions.length > 0 ? (
        <div className={styles.optionBlock}>
          {/* <span className={styles.optionLabel}>Colors</span> */}
          <div className={styles.chipRow}>
            {colorOptions.map((option) => {
              const selected = option.key === selectedColorKey;
              const matchedVariant =
                variants.find((variant) => getColorKey(variant) === option.key) || null;
              const colorValue = matchedVariant ? getColorValue(matchedVariant) : "";
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`${styles.colorChip} ${selected ? styles.colorChipSelected : ""}`}
                  onClick={() => {
                    const nextVariant = findVariantByFilters(variants, {
                      measureKey: selectedMeasureKey || undefined,
                      colorKey: option.key,
                    });
                    const nextId = getItemId(nextVariant);
                    if (nextId) {
                      onSelectVariant(nextId);
                    }
                  }}
                >
                  <span
                    className={styles.colorSwatch}
                    style={{ backgroundColor: colorValue || "#d9d9d9" }}
                    aria-hidden="true"
                  />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
