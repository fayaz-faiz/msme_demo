type PriceDisplayInput = {
  sellingPrice?: number | string | null;
  mrpPrice?: number | string | null;
  discountPercentage?: number | string | null;
};

type PriceDisplayOutput = {
  sellingPrice: number;
  mrpPrice?: number;
  discountLabel?: string;
};

const formatDiscountLabel = (value: number) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2).replace(/\.?0+$/, "")}% off`;

export function buildPriceDisplay({
  sellingPrice,
  mrpPrice,
  discountPercentage,
}: PriceDisplayInput): PriceDisplayOutput {
  const normalizedSellingPrice = Number(sellingPrice || 0);
  const normalizedMrpPrice = Number(mrpPrice || 0);
  const normalizedDiscount = Number(discountPercentage || 0);

  if (normalizedMrpPrice > normalizedSellingPrice && normalizedMrpPrice > 0) {
    const discountFromPrice =
      ((normalizedMrpPrice - normalizedSellingPrice) / normalizedMrpPrice) * 100;

    return {
      sellingPrice: normalizedSellingPrice,
      mrpPrice: normalizedMrpPrice,
      discountLabel:
        normalizedDiscount > 0
          ? formatDiscountLabel(normalizedDiscount)
          : formatDiscountLabel(discountFromPrice),
    };
  }

  if (normalizedDiscount > 0) {
    return {
      sellingPrice: normalizedSellingPrice,
      discountLabel: formatDiscountLabel(normalizedDiscount),
    };
  }

  return {
    sellingPrice: normalizedSellingPrice,
  };
}
