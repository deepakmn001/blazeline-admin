"use client";

import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction, KeyboardEvent } from "react";

import { Plus, X, ListTree, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import type { ProductOption, ProductOptionValue } from "@/types/catalog";

type Props = {
  options: ProductOption[];
  setOptions: Dispatch<SetStateAction<ProductOption[]>>;
};

const SUGGESTED_OPTION_TYPES = ["Finish", "Size", "Color", "Capacity", "Thickness"];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function createEmptyOption(name = ""): ProductOption {
  return {
    name,
    display_type: "dropdown",
    sort_order: 0,
    values: [],
  };
}

function createEmptyValue(value: string): ProductOptionValue {
  return { value, hex_color: "", sort_order: 0 };
}

export function ProductOptions({ options, setOptions }: Props) {
  const [draftValue, setDraftValue] = useState<Record<number, string>>({});

  const addOption = useCallback(
    (name = "") => {
      setOptions((prev) => [...prev, createEmptyOption(name)]);
    },
    [setOptions]
  );

  const removeOption = useCallback(
    (index: number) => {
      setOptions((prev) => prev.filter((_, i) => i !== index));
    },
    [setOptions]
  );

  const renameOption = useCallback(
    (index: number, name: string) => {
      setOptions((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], name };
        return next;
      });
    },
    [setOptions]
  );

  const addValue = useCallback(
    (optionIndex: number) => {
      const raw = (draftValue[optionIndex] ?? "").trim();
      if (!raw) return;

      setOptions((prev) => {
        const option = prev[optionIndex];
        if (!option) return prev;

        const alreadyExists = option.values.some(
          (v) => normalize(v.value) === normalize(raw)
        );
        if (alreadyExists) return prev;

        const next = [...prev];
        next[optionIndex] = {
          ...option,
          values: [...option.values, createEmptyValue(raw)],
        };
        return next;
      });

      setDraftValue((prev) => ({ ...prev, [optionIndex]: "" }));
    },
    [draftValue, setOptions]
  );

  const removeValue = useCallback(
    (optionIndex: number, valueIndex: number) => {
      setOptions((prev) => {
        const option = prev[optionIndex];
        if (!option) return prev;

        const next = [...prev];
        next[optionIndex] = {
          ...option,
          values: option.values.filter((_, i) => i !== valueIndex),
        };
        return next;
      });
    },
    [setOptions]
  );

  function handleValueKeyDown(event: KeyboardEvent<HTMLInputElement>, optionIndex: number) {
    if (event.key === "Enter") {
      event.preventDefault();
      addValue(optionIndex);
    }
  }

  const duplicateOptionNames = new Set<number>();
  {
    const seen = new Map<string, number>();
    options.forEach((option) => {
      const key = normalize(option.name);
      if (!key) return;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    });
    options.forEach((option, index) => {
      const key = normalize(option.name);
      if (key && (seen.get(key) ?? 0) > 1) {
        duplicateOptionNames.add(index);
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-line bg-neutral-50/60 px-6 py-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <ListTree className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">Product Options</h2>
          <p className="mt-1 text-sm text-ink-faint">
            Define the option types this product varies by, and the values each can take.
            Variants below can only select from these values.
          </p>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {options.length === 0 && (
          <p className="rounded-xl border border-dashed border-line/70 bg-neutral-50/40 p-4 text-sm text-ink-faint">
            No option types yet. Add one below (e.g. &quot;Finish&quot;) to start defining variants.
          </p>
        )}

        {options.map((option, optionIndex) => {
          const nameEmpty = option.name.trim().length === 0;
          const isDuplicate = duplicateOptionNames.has(optionIndex);

          return (
            <div
              key={optionIndex}
              className="rounded-xl border border-line/70 bg-neutral-50/40 p-4 sm:p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Option Type
                  </label>
                  <Input
                    value={option.name}
                    onChange={(e) => renameOption(optionIndex, e.target.value)}
                    placeholder="Finish"
                    aria-invalid={nameEmpty || isDuplicate}
                    className={
                      nameEmpty || isDuplicate
                        ? "border-red-300 focus-visible:ring-red-400"
                        : "bg-white focus-visible:ring-brand-400"
                    }
                  />
                  {nameEmpty ? (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Option type is required.
                    </p>
                  ) : isDuplicate ? (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      This option type already exists.
                    </p>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  aria-label={`Remove option ${option.name || optionIndex + 1}`}
                  className="mt-6 h-9 w-9 shrink-0"
                  onClick={() => removeOption(optionIndex)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Values
              </label>

              <div className="mb-2 flex flex-wrap gap-1.5">
                {option.values.map((value, valueIndex) => (
                  <span
                    key={valueIndex}
                    className="inline-flex items-center gap-1 rounded-full border border-line/70 bg-white px-3 py-1 text-xs font-medium text-ink"
                  >
                    {value.value}
                    <button
                      type="button"
                      aria-label={`Remove value ${value.value}`}
                      onClick={() => removeValue(optionIndex, valueIndex)}
                      className="text-ink-faint transition-colors hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                {option.values.length === 0 && (
                  <span className="text-xs text-ink-faint">No values yet.</span>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  value={draftValue[optionIndex] ?? ""}
                  onChange={(e) =>
                    setDraftValue((prev) => ({ ...prev, [optionIndex]: e.target.value }))
                  }
                  onKeyDown={(e) => handleValueKeyDown(e, optionIndex)}
                  placeholder="GD"
                  className="bg-white focus-visible:ring-brand-400"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addValue(optionIndex)}
                  className="shrink-0 gap-1.5"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add
                </Button>
              </div>
            </div>
          );
        })}

        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => addOption()}
            className="w-full justify-center gap-2 rounded-xl border-dashed border-line py-5 text-sm font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 sm:w-auto sm:px-6"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Option Type
          </Button>

          <p className="mb-2 mt-3 text-xs text-ink-faint">Suggested types</p>
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="Suggested option types">
            {SUGGESTED_OPTION_TYPES.map((type) => {
              const alreadyAdded = options.some((o) => normalize(o.name) === normalize(type));
              return (
                <button
                  key={type}
                  type="button"
                  role="listitem"
                  disabled={alreadyAdded}
                  onClick={() => addOption(type)}
                  className="rounded-full disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Badge
                    variant="secondary"
                    className="cursor-pointer select-none rounded-full border border-line/70 bg-white px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {type}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}