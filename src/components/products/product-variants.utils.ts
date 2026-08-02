// src/components/products/product-variants.utils.ts
import type {
  ProductOption,
  ProductVariant,
  ProductVariantPayload,
  VariantOptionValue,
} from "@/types/catalog";

const DEFAULT_CURRENCY = "INR";

export function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

/** Always-populated accessor — GET payloads may omit `option_values`. */
export function getOptionValues(variant: ProductVariant): VariantOptionValue[] {
  return variant.option_values ?? variant.selections ?? [];
}

/** Builds a readable label for a variant from its selected option values. */
export function getVariantLabel(variant: ProductVariant): string {
  return getOptionValues(variant)
    .map((ov) => ov.value)
    .filter(Boolean)
    .join(" / ");
}

export function generateSKU(value: string): string {
  const collapsed = value.trim().replace(/\s+/g, " ");
  const dashed = collapsed.replace(/\s+/g, "-");
  const upper = dashed.toUpperCase();

  return upper.replace(/[^A-Z0-9-]/g, "");
}

export function getEffectiveSku(variant: ProductVariant): string {
  const trimmedSku = (variant.sku ?? "").trim();

  if (trimmedSku) {
    return trimmedSku;
  }

  return generateSKU(getVariantLabel(variant));
}

export function findDuplicateSKUs(variants: ProductVariant[]): Set<number> {
  const countBySku = new Map<string, number>();

  variants.forEach((variant) => {
    const normalized = normalize(getEffectiveSku(variant));
    if (!normalized) return;
    countBySku.set(normalized, (countBySku.get(normalized) ?? 0) + 1);
  });

  const duplicates = new Set<number>();

  variants.forEach((variant, index) => {
    const normalized = normalize(getEffectiveSku(variant));
    if (normalized && (countBySku.get(normalized) ?? 0) > 1) {
      duplicates.add(index);
    }
  });

  return duplicates;
}

/** Identifies a variant by its full set of selected option values. */
function comboKey(variant: ProductVariant): string {
  return getOptionValues(variant)
    .map((ov) => `${normalize(ov.option)}:${normalize(ov.value)}`)
    .filter((entry) => !entry.endsWith(":"))
    .sort()
    .join("|");
}

export function findDuplicateCombinations(variants: ProductVariant[]): Set<number> {
  const countByCombo = new Map<string, number>();

  variants.forEach((variant) => {
    const key = comboKey(variant);
    if (!key) return;
    countByCombo.set(key, (countByCombo.get(key) ?? 0) + 1);
  });

  const duplicates = new Set<number>();

  variants.forEach((variant, index) => {
    const key = comboKey(variant);
    if (key && (countByCombo.get(key) ?? 0) > 1) {
      duplicates.add(index);
    }
  });

  return duplicates;
}

export function calculateDiscount(mrp: number, sellingPrice: number): number | null {
  if (mrp <= 0 || sellingPrice <= 0 || sellingPrice > mrp) {
    return null;
  }

  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

/** Creates an empty variant with one unset option-value slot per existing option axis. */
export function createEmptyVariant(options: ProductOption[]): ProductVariant {
  return {
    sku: "",
    mrp: 0,
    selling_price: 0,
    stock: 0,
    currency: DEFAULT_CURRENCY,
    in_stock: true,
    gst_included: true,
    gst_rate: 0,
    estimated_dispatch_days: 0,
    option_values: options.map((option) => ({
      option: option.name,
      value: "",
      hex_color: null,
      image: null,
    })),
  };
}

/**
 * Normalizes a variant loaded from a GET response (which only carries
 * `selections`) into frontend working state where `option_values` is
 * always populated. Pure data shape fix — no option inference.
 */
export function hydrateVariant(variant: ProductVariant): ProductVariant {
  return {
    ...variant,
    option_values: getOptionValues(variant),
  };
}

/**
 * Keeps a variant's `option_values` entries aligned with the current
 * set of option axes — adds a slot for newly-added options, drops
 * slots for removed options. Never invents a value.
 */
export function reconcileVariantOptions(
  variant: ProductVariant,
  options: ProductOption[]
): ProductVariant {
  const existingByOption = new Map(
    getOptionValues(variant).map((ov) => [normalize(ov.option), ov])
  );

  const nextOptionValues: VariantOptionValue[] = options.map((option) => {
    const existing = existingByOption.get(normalize(option.name));
    return (
      existing ?? {
        option: option.name,
        value: "",
        hex_color: null,
        image: null,
      }
    );
  });

  return { ...variant, option_values: nextOptionValues };
}

export function setVariantOptionValue(
  variant: ProductVariant,
  optionName: string,
  value: string
): ProductVariant {
  const current = getOptionValues(variant);

  const nextOptionValues = current.map((ov) =>
    normalize(ov.option) === normalize(optionName) ? { ...ov, value } : ov
  );

  return { ...variant, option_values: nextOptionValues };
}

/**
 * Produces a clean list of variants ready to hand to `toVariantPayload`.
 * Drops fully-empty rows, trims SKUs / option values, and de-duplicates
 * by SKU and by option-value combination.
 */
export function sanitizeVariants(variants: ProductVariant[]): ProductVariant[] {
  const seenSkus = new Set<string>();
  const seenCombos = new Set<string>();
  const cleaned: ProductVariant[] = [];

  for (const variant of variants) {
    const optionValues = getOptionValues(variant);
    const hasAnyValue = optionValues.some((ov) => ov.value.trim().length > 0);
    const sku = getEffectiveSku(variant);

    if (!hasAnyValue && !sku) {
      continue;
    }

    const normalizedSku = normalize(sku);
    const combo = comboKey(variant);

    if (normalizedSku && seenSkus.has(normalizedSku)) {
      continue;
    }

    if (combo && seenCombos.has(combo)) {
      continue;
    }

    if (normalizedSku) seenSkus.add(normalizedSku);
    if (combo) seenCombos.add(combo);

    cleaned.push({
      ...variant,
      sku,
      option_values: optionValues.map((ov) => ({ ...ov, value: ov.value.trim() })),
    });
  }

  return cleaned;
}

/**
 * Maps a variant into the exact backend POST/PUT write contract.
 * Drops read-only fields (`images`, `selections`, `name`).
 */
export function toVariantPayload(variant: ProductVariant): ProductVariantPayload {
  const { images: _images, selections: _selections, name: _name, option_values, ...rest } =
    variant;

  return {
    ...rest,
    option_values: option_values ?? [],
  };
}