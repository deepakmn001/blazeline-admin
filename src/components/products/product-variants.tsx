"use client";

import { memo, useCallback, useMemo } from "react";
import type { Dispatch, SetStateAction, KeyboardEvent } from "react";

import { Plus, Trash2, Layers, Info, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import type { ProductOption, ProductVariant } from "@/types/catalog";
import {
  calculateDiscount,
  createEmptyVariant,
  findDuplicateCombinations,
  findDuplicateSKUs,
  generateSKU,
  getEffectiveSku,
  getOptionValues,
  getVariantLabel,
  setVariantOptionValue,
} from "./product-variants.utils";

type Props = {
  options: ProductOption[];
  variants: ProductVariant[];
  setVariants: Dispatch<SetStateAction<ProductVariant[]>>;
};

type NumericField = "mrp" | "selling_price" | "stock";

type VariantRowProps = {
  index: number;
  variant: ProductVariant;
  options: ProductOption[];
  isDuplicateSku: boolean;
  isDuplicateCombo: boolean;
  canDelete: boolean;
  onOptionValueChange: (index: number, optionName: string, value: string) => void;
  onFieldChange: (index: number, field: NumericField | "sku", value: string | number) => void;
  onBlurSku: (index: number) => void;
  onRemove: (index: number) => void;
  onEnter: (index: number) => void;
};

const VariantRow = memo(function VariantRow({
  index,
  variant,
  options,
  isDuplicateSku,
  isDuplicateCombo,
  canDelete,
  onOptionValueChange,
  onFieldChange,
  onBlurSku,
  onRemove,
  onEnter,
}: VariantRowProps) {
  const displaySku = variant.sku || generateSKU(getVariantLabel(variant));
  const optionValues = getOptionValues(variant);

  const discount = useMemo(
    () => calculateDiscount(variant.mrp, variant.selling_price),
    [variant.mrp, variant.selling_price]
  );

  const skuEmpty = getEffectiveSku(variant).length === 0;
  const skuHasError = skuEmpty || isDuplicateSku;
  const priceExceedsMrp =
    variant.mrp > 0 && variant.selling_price > 0 && variant.selling_price > variant.mrp;
  const priceHasError = variant.selling_price < 0 || priceExceedsMrp;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onEnter(index);
    }
  }

  return (
    <div className="group/card relative overflow-hidden rounded-2xl border border-line/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 ease-out hover:border-line hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.14)] sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
            {index + 1}
          </span>
          <h3 className="truncate text-sm font-semibold text-ink sm:text-base">
            Variant {index + 1}
          </h3>
          <Badge variant="brand" className="max-w-[12rem] truncate sm:max-w-[16rem]">
            {getVariantLabel(variant) || "New Variant"}
          </Badge>
          {isDuplicateCombo && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-600">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Duplicate combination
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="destructive"
          size="icon"
          aria-label={`Remove variant ${index + 1}`}
          disabled={!canDelete}
          className="h-9 w-9 shrink-0 opacity-80 transition-opacity hover:opacity-100 disabled:opacity-30"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {options.length === 0 ? (
        <p className="mb-5 rounded-xl border border-dashed border-line/70 bg-neutral-50/40 p-3 text-sm text-ink-faint">
          Add option types in &quot;Product Options&quot; above before selecting variant values.
        </p>
      ) : (
        <div className="mb-5 grid gap-5 sm:grid-cols-2">
          {options.map((option) => {
            const selected = optionValues.find(
              (ov) => ov.option.trim().toLowerCase() === option.name.trim().toLowerCase()
            );
            const fieldId = `variant-${index}-option-${option.name}`;
            const isEmpty = !selected || selected.value.trim().length === 0;

            return (
              <div key={option.name}>
                <label
                  htmlFor={fieldId}
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint"
                >
                  {option.name}
                </label>

                <select
                  id={fieldId}
                  value={selected?.value ?? ""}
                  onChange={(e) => onOptionValueChange(index, option.name, e.target.value)}
                  aria-invalid={isEmpty}
                  className={
                    "h-10 w-full rounded-xl border bg-white px-3 text-sm text-ink outline-none transition-all " +
                    (isEmpty
                      ? "border-red-300 focus-visible:ring-2 focus-visible:ring-red-400"
                      : "border-line/80 focus-visible:ring-2 focus-visible:ring-brand-400")
                  }
                >
                  <option value="">Select {option.name}</option>
                  {option.values.map((value) => (
                    <option key={value.value} value={value.value}>
                      {value.value}
                    </option>
                  ))}
                </select>

                {isEmpty && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Select a value for {option.name}.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`variant-sku-${index}`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint"
          >
            SKU
          </label>
          <Input
            id={`variant-sku-${index}`}
            placeholder="SKU"
            value={displaySku}
            aria-invalid={skuHasError}
            className={
              "font-mono " +
              (skuHasError
                ? "border-red-300 focus-visible:ring-red-400"
                : "focus-visible:ring-brand-400")
            }
            onChange={(e) => onFieldChange(index, "sku", e.target.value)}
            onBlur={() => onBlurSku(index)}
            onKeyDown={handleKeyDown}
          />
          {skuEmpty ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
              <AlertCircle className="h-3 w-3 shrink-0" />
              SKU is required.
            </p>
          ) : isDuplicateSku ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
              <AlertCircle className="h-3 w-3 shrink-0" />
              This SKU already exists.
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-ink-faint">
              Auto-generated from the selected values if left blank.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`variant-mrp-${index}`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint"
          >
            MRP
          </label>
          <Input
            id={`variant-mrp-${index}`}
            placeholder="₹2500"
            value={variant.mrp || ""}
            aria-invalid={variant.mrp < 0}
            className={
              variant.mrp < 0
                ? "border-red-300 focus-visible:ring-red-400"
                : "focus-visible:ring-brand-400"
            }
            onChange={(e) => onFieldChange(index, "mrp", Number(e.target.value))}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div>
          <label
            htmlFor={`variant-price-${index}`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint"
          >
            Selling Price
          </label>
          <Input
            id={`variant-price-${index}`}
            placeholder="₹2100"
            value={variant.selling_price || ""}
            aria-invalid={priceHasError}
            className={
              priceHasError
                ? "border-red-300 focus-visible:ring-red-400"
                : "focus-visible:ring-brand-400"
            }
            onChange={(e) => onFieldChange(index, "selling_price", Number(e.target.value))}
            onKeyDown={handleKeyDown}
          />
          {priceExceedsMrp ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Selling price cannot exceed MRP.
            </p>
          ) : discount !== null && discount > 0 ? (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
              {discount}% OFF
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-ink-faint">No discount</p>
          )}
        </div>

        <div>
          <label
            htmlFor={`variant-stock-${index}`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint"
          >
            Stock
          </label>
          <Input
            id={`variant-stock-${index}`}
            placeholder="25"
            value={variant.stock || ""}
            aria-invalid={variant.stock < 0}
            className={
              variant.stock < 0
                ? "border-red-300 focus-visible:ring-red-400"
                : "focus-visible:ring-brand-400"
            }
            onChange={(e) => onFieldChange(index, "stock", Number(e.target.value))}
            onKeyDown={handleKeyDown}
          />
          <p
            className={
              "mt-1.5 text-xs " + (variant.stock > 0 ? "text-ink-faint" : "text-amber-600")
            }
          >
            {variant.stock > 0 ? `${variant.stock} units available` : "No stock"}
          </p>
        </div>
      </div>
    </div>
  );
});

export function ProductVariants({ options, variants, setVariants }: Props) {
  const duplicateSkuIndexes = useMemo(() => findDuplicateSKUs(variants), [variants]);
  const duplicateComboIndexes = useMemo(() => findDuplicateCombinations(variants), [variants]);

  const addVariant = useCallback(() => {
    setVariants((prev) => [...prev, createEmptyVariant(options)]);
  }, [setVariants, options]);

  const insertVariantAfter = useCallback(
    (index: number) => {
      setVariants((prev) => {
        const next = [...prev];
        next.splice(index + 1, 0, createEmptyVariant(options));
        return next;
      });
    },
    [setVariants, options]
  );

  const removeVariant = useCallback(
    (index: number) => {
      setVariants((prev) => {
        if (prev.length === 1) {
          return [createEmptyVariant(options)];
        }
        return prev.filter((_, i) => i !== index);
      });
    },
    [setVariants, options]
  );

  const handleOptionValueChange = useCallback(
    (index: number, optionName: string, value: string) => {
      setVariants((prev) => {
        const current = prev[index];
        if (!current) return prev;
        const next = [...prev];
        next[index] = setVariantOptionValue(current, optionName, value);
        return next;
      });
    },
    [setVariants]
  );

  const handleFieldChange = useCallback(
    (index: number, field: NumericField | "sku", value: string | number) => {
      setVariants((prev) => {
        const current = prev[index];
        if (!current) return prev;
        const next = [...prev];
        next[index] = { ...current, [field]: value } as ProductVariant;
        return next;
      });
    },
    [setVariants]
  );

  const handleBlurSku = useCallback(
    (index: number) => {
      setVariants((prev) => {
        const current = prev[index];
        if (!current) return prev;
        const trimmed = current.sku.trim();
        if (trimmed === current.sku) return prev;
        const next = [...prev];
        next[index] = { ...current, sku: trimmed };
        return next;
      });
    },
    [setVariants]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-line bg-neutral-50/60 px-6 py-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Layers className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">Product Variants</h2>
          <p className="mt-1 text-sm text-ink-faint">
            Pick a value for each option type to create a sellable variant.
          </p>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div className="space-y-4">
          {variants.map((variant, index) => (
            <VariantRow
              key={index}
              index={index}
              variant={variant}
              options={options}
              isDuplicateSku={duplicateSkuIndexes.has(index)}
              isDuplicateCombo={duplicateComboIndexes.has(index)}
              canDelete={variants.length > 1}
              onOptionValueChange={handleOptionValueChange}
              onFieldChange={handleFieldChange}
              onBlurSku={handleBlurSku}
              onRemove={removeVariant}
              onEnter={insertVariantAfter}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addVariant}
          className="w-full justify-center gap-2 rounded-xl border-dashed border-line py-5 text-sm font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 sm:w-auto sm:px-6"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Variant
        </Button>

        <div className="flex gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="text-sm text-ink">
            <p className="font-semibold">Tip</p>
            <p className="mt-1.5 text-xs text-ink-faint sm:text-sm">
              Each variant needs one value per option type, plus its own SKU, price and stock.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}