"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction, KeyboardEvent } from "react";

import { Plus, Trash2, ClipboardList, Search, ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ProductSpecification } from "@/types/catalog";

type Props = {
  specifications: ProductSpecification[];
  setSpecifications: Dispatch<SetStateAction<ProductSpecification[]>>;
};

type SpecificationField = keyof ProductSpecification;

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

/**
 * Returns a clean, submission-ready list of specifications:
 * - trims key/value
 * - drops rows where key or value is empty
 * - drops duplicate keys (case insensitive), keeping the first occurrence
 *
 * ProductForm can call this right before submitting to the backend
 * to guarantee a clean payload, without changing how this component
 * stores/edits the working list.
 */
export function sanitizeSpecifications(
  specifications: ProductSpecification[]
): ProductSpecification[] {
  const seen = new Set<string>();

  const cleaned: ProductSpecification[] = [];

  for (const spec of specifications) {
    const key = spec.key.trim();
    const value = spec.value.trim();

    if (!key || !value) {
      continue;
    }

    const normalized = normalizeKey(key);

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);

    cleaned.push({ key, value });
  }

  return cleaned;
}

function findDuplicateIndexes(
  specifications: ProductSpecification[]
): Set<number> {
  const countByKey = new Map<string, number>();

  specifications.forEach((spec) => {
    const normalized = normalizeKey(spec.key);

    if (!normalized) {
      return;
    }

    countByKey.set(normalized, (countByKey.get(normalized) ?? 0) + 1);
  });

  const duplicateIndexes = new Set<number>();

  specifications.forEach((spec, index) => {
    const normalized = normalizeKey(spec.key);

    if (normalized && (countByKey.get(normalized) ?? 0) > 1) {
      duplicateIndexes.add(index);
    }
  });

  return duplicateIndexes;
}

// ==========================================
// COMMON SPECIFICATION KEYS (UI-only reference data)
// ==========================================
// Presentation-layer suggestions only. The Key field remains a free-text
// input bound to spec.key — selecting a suggestion just fills that same
// input via the existing onChange handler. No new validation, no new
// payload shape, no restriction on what the admin can type.

const COMMON_SPEC_KEYS = [
  "Material",
  "Brand",
  "Color",
  "Finish",
  "Size",
  "Thickness",
  "Weight",
  "Dimensions",
  "Capacity",
  "Voltage",
  "Wattage",
  "Application",
  "Country of Origin",
  "Warranty",
];

// ==========================================
// SPECIFICATION KEY FIELD (combobox: free text + suggestions)
// ==========================================

type SpecificationKeyFieldProps = {
  id: string;
  value: string;
  isDuplicate: boolean;
  errorId: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

const SpecificationKeyField = memo(function SpecificationKeyField({
  id,
  value,
  isDuplicate,
  errorId,
  onChange,
  onBlur,
  onKeyDown,
}: SpecificationKeyFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () =>
      document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredKeys = useMemo(() => {
    const normalizedQuery = value.trim().toLowerCase();

    if (!normalizedQuery) {
      return COMMON_SPEC_KEYS;
    }

    return COMMON_SPEC_KEYS.filter((key) =>
      key.toLowerCase().includes(normalizedQuery)
    );
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={
          "flex items-center gap-2 rounded-lg border bg-white px-3 py-2 transition-colors " +
          (isDuplicate
            ? "border-red-300"
            : isOpen
            ? "border-brand-400 ring-2 ring-brand-100"
            : "border-line hover:border-line/100")
        }
      >
        <Search
          className="h-3.5 w-3.5 shrink-0 text-ink-faint"
          aria-hidden="true"
        />

        <input
          id={id}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-invalid={isDuplicate}
          aria-describedby={isDuplicate ? errorId : undefined}
          autoComplete="off"
          placeholder="Material"
          value={value}
          className="w-full min-w-0 border-0 bg-transparent p-0 text-sm text-ink outline-none placeholder:text-ink-faint"
          onFocus={() => setIsOpen(true)}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            onBlur();
            // slight delay so a suggestion click still registers before close
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            }
            onKeyDown(e);
          }}
        />

        <ChevronDown
          className={
            "h-3.5 w-3.5 shrink-0 cursor-pointer text-ink-faint transition-transform " +
            (isOpen ? "rotate-180" : "")
          }
          aria-hidden="true"
          onClick={() => setIsOpen((prev) => !prev)}
        />
      </div>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.2)]"
        >
          {filteredKeys.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-faint">
              No matching key — keep typing to use a custom one.
            </li>
          ) : (
            filteredKeys.map((key) => (
              <li key={key} role="option" aria-selected={value === key}>
                <button
                  type="button"
                  className={
                    "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors " +
                    (value === key
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink hover:bg-neutral-50")
                  }
                  onMouseDown={(e) => {
                    // prevent input blur from firing before the click registers
                    e.preventDefault();
                    onChange(key);
                    setIsOpen(false);
                  }}
                >
                  {key}
                </button>
              </li>
            ))
          )}

          <li className="mt-1 border-t border-line/70 pt-1">
            <button
              type="button"
              className="flex w-full items-center gap-1.5 rounded-md px-3 py-2 text-left text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Custom Specification
            </button>
          </li>
        </ul>
      )}
    </div>
  );
});

// ==========================================
// SPECIFICATION ROW
// ==========================================

type SpecificationRowProps = {
  index: number;
  spec: ProductSpecification;
  isDuplicate: boolean;
  canDelete: boolean;
  onChange: (
    index: number,
    field: SpecificationField,
    value: string
  ) => void;
  onBlurField: (index: number, field: SpecificationField) => void;
  onRemove: (index: number) => void;
  onEnter: (index: number) => void;
};

const SpecificationRow = memo(function SpecificationRow({
  index,
  spec,
  isDuplicate,
  canDelete,
  onChange,
  onBlurField,
  onRemove,
  onEnter,
}: SpecificationRowProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onEnter(index);
    }
  }

  const keyFieldId = `spec-key-${index}`;
  const valueFieldId = `spec-value-${index}`;
  const keyErrorId = `${keyFieldId}-error`;

  return (
    <div className="group/card relative overflow-hidden rounded-2xl border border-line/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 ease-out hover:border-line hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.14)] sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600 sm:mt-2">
          {index + 1}
        </span>

        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          {/* Key */}
          <div>
            <label
              htmlFor={keyFieldId}
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint"
            >
              Specification Key
            </label>

            <SpecificationKeyField
              id={keyFieldId}
              value={spec.key}
              isDuplicate={isDuplicate}
              errorId={keyErrorId}
              onChange={(value) => onChange(index, "key", value)}
              onBlur={() => onBlurField(index, "key")}
              onKeyDown={handleKeyDown}
            />

            {isDuplicate && (
              <p
                id={keyErrorId}
                role="alert"
                className="mt-1.5 text-xs font-medium text-red-600"
              >
                This specification key already exists.
              </p>
            )}
          </div>

          {/* Value */}
          <div>
            <label
              htmlFor={valueFieldId}
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint"
            >
              Specification Value
            </label>

            <Input
              id={valueFieldId}
              placeholder="Ceramic"
              value={spec.value}
              className="focus-visible:ring-brand-400"
              onChange={(e) => onChange(index, "value", e.target.value)}
              onBlur={() => onBlurField(index, "value")}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove specification ${index + 1}`}
          disabled={!canDelete}
          className="mt-6 h-9 w-9 shrink-0 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 sm:mt-7"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

// ==========================================
// PRODUCT SPECIFICATIONS
// ==========================================

export function ProductSpecifications({
  specifications,
  setSpecifications,
}: Props) {
  const duplicateIndexes = useMemo(
    () => findDuplicateIndexes(specifications),
    [specifications]
  );

  const hasSpecifications = specifications.length > 0;

  const addSpecification = useCallback(() => {
    setSpecifications((prev) => [
      ...prev,
      {
        key: "",
        value: "",
      },
    ]);
  }, [setSpecifications]);

  const insertSpecificationAfter = useCallback(
    (index: number) => {
      setSpecifications((prev) => {
        const next = [...prev];

        next.splice(index + 1, 0, {
          key: "",
          value: "",
        });

        return next;
      });
    },
    [setSpecifications]
  );

  const removeSpecification = useCallback(
    (index: number) => {
      setSpecifications((prev) => {
        if (prev.length === 1) {
          return [
            {
              key: "",
              value: "",
            },
          ];
        }

        return prev.filter((_, i) => i !== index);
      });
    },
    [setSpecifications]
  );

  const updateField = useCallback(
    (index: number, field: SpecificationField, value: string) => {
      setSpecifications((prev) => {
        const next = [...prev];

        next[index] = {
          ...next[index],
          [field]: value,
        };

        return next;
      });
    },
    [setSpecifications]
  );

  const trimField = useCallback(
    (index: number, field: SpecificationField) => {
      setSpecifications((prev) => {
        const current = prev[index];

        if (!current) {
          return prev;
        }

        const rawValue = current[field];
        const stringValue =
          typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
        const trimmed = stringValue.trim();

        if (trimmed === rawValue) {
          return prev;
        }

        const next = [...prev];

        next[index] = {
          ...current,
          [field]: trimmed,
        };

        return next;
      });
    },
    [setSpecifications]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      {/* Section header */}
      <div className="flex items-start gap-3 border-b border-line bg-neutral-50/60 px-6 py-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <ClipboardList className="h-4.5 w-4.5" aria-hidden="true" />
        </span>

        <div>
          <h2 className="text-lg font-semibold text-ink">
            Specifications
          </h2>

          <p className="mt-1 text-sm text-ink-faint">
            Technical details customers will see on the product page.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {hasSpecifications ? (
          <div className="space-y-3">
            {specifications.map((spec, index) => (
              <SpecificationRow
                key={index}
                index={index}
                spec={spec}
                isDuplicate={duplicateIndexes.has(index)}
                canDelete={specifications.length > 1}
                onChange={updateField}
                onBlurField={trimField}
                onRemove={removeSpecification}
                onEnter={insertSpecificationAfter}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-neutral-50/50 px-6 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-faint shadow-sm">
              <ClipboardList className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-ink">
              No specifications yet
            </p>
            <p className="max-w-xs text-xs text-ink-faint">
              Add technical details like material, size or capacity so buyers know exactly what they&apos;re getting.
            </p>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={addSpecification}
          className="w-full justify-center gap-2 rounded-xl border-dashed border-line py-5 text-sm font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Specification
        </Button>
      </div>
    </div>
  );
}

