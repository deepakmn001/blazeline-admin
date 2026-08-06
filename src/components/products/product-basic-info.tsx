"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";

import {
  AlertCircle,
  Boxes,
  Check,
  ChevronDown,
  Info,
  Link2,
  Loader2,
} from "lucide-react";

import { Input } from "@/components/ui/input";

import { getCategories } from "@/services/category.service";
import { getSubCategories } from "@/services/subcategory.service";

import type { Category } from "@/types/category";
import type { SubCategory } from "@/types/subcategory";

type ProductBasicInfoProps = {
  productName: string;

  category: number | "";
  subCategory: number | "";

  description: string;
  slug: string;

  onProductNameChange: (value: string) => void;
  onCategoryChange: (value: number | "") => void;
  onSubCategoryChange: (value: number | "") => void;
  onDescriptionChange: (value: string) => void;
};

const DESCRIPTION_MAX_LENGTH = 1000;

// ==========================================
// Premium Combobox (replaces native <select>)
// ==========================================
// Presentation-only control. Emits the exact same
// `number | ""` value a native <select> would via onChange.

type ComboOption = {
  id: number;
  name: string;
};

type PremiumComboboxProps = {
  id: string;
  value: number | "";
  onChange: (value: number | "") => void;
  options: ComboOption[];
  placeholder: string;
  loadingLabel: string;
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  emptyLabel?: string;
};

const PremiumCombobox = memo(function PremiumCombobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  loadingLabel,
  loading = false,
  disabled = false,
  required = false,
  invalid = false,
  describedBy,
  emptyLabel = "No options available",
}: PremiumComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const typeaheadRef = useRef<{
    query: string;
    timeoutId: ReturnType<typeof setTimeout> | null;
  }>({ query: "", timeoutId: null });

  const listboxId = useId();
  const isInteractive = !disabled && !loading;
  const selectedOption =
    options.find((option) => option.id === value) ?? null;

  const closeMenu = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const commitValue = useCallback(
    (nextValue: number | "") => {
      onChange(nextValue);
      closeMenu();
    },
    [onChange, closeMenu]
  );

  // Close on outside click.
  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open, closeMenu]);

  // Force-close if the control becomes disabled/loading while open.
  useEffect(() => {
    if (!isInteractive && open) {
      closeMenu();
    }
  }, [isInteractive, open, closeMenu]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (open && highlightedIndex >= 0) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [open, highlightedIndex]);

  const openMenu = useCallback(() => {
    if (!isInteractive) {
      return;
    }

    const initialIndex = options.findIndex(
      (option) => option.id === value
    );

    setHighlightedIndex(initialIndex >= 0 ? initialIndex : 0);
    setOpen(true);
  }, [isInteractive, options, value]);

  const runTypeahead = useCallback(
    (char: string) => {
      const state = typeaheadRef.current;

      state.query += char.toLowerCase();

      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
      }

      state.timeoutId = setTimeout(() => {
        state.query = "";
      }, 500);

      const matchIndex = options.findIndex((option) =>
        option.name.toLowerCase().startsWith(state.query)
      );

      if (matchIndex === -1) {
        return;
      }

      if (open) {
        setHighlightedIndex(matchIndex);
      } else {
        onChange(options[matchIndex].id);
      }
    },
    [options, open, onChange]
  );

  const handleButtonKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (!isInteractive) {
        return;
      }

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();

          if (!open) {
            openMenu();
          } else {
            setHighlightedIndex((current) =>
              Math.min(current + 1, options.length - 1)
            );
          }

          break;
        }

        case "ArrowUp": {
          event.preventDefault();

          if (!open) {
            openMenu();
          } else {
            setHighlightedIndex((current) => Math.max(current - 1, 0));
          }

          break;
        }

        case "Home": {
          if (open) {
            event.preventDefault();
            setHighlightedIndex(0);
          }

          break;
        }

        case "End": {
          if (open) {
            event.preventDefault();
            setHighlightedIndex(options.length - 1);
          }

          break;
        }

        case "Enter":
        case " ": {
          event.preventDefault();

          if (!open) {
            openMenu();
          } else if (
            highlightedIndex >= 0 &&
            options[highlightedIndex]
          ) {
            commitValue(options[highlightedIndex].id);
          }

          break;
        }

        case "Escape": {
          if (open) {
            event.preventDefault();
            closeMenu();
          }

          break;
        }

        case "Tab": {
          closeMenu();
          break;
        }

        case "Backspace": {
          typeaheadRef.current.query = "";
          break;
        }

        default: {
          if (event.key.length === 1 && /[a-z0-9]/i.test(event.key)) {
            runTypeahead(event.key);
          }

          break;
        }
      }
    },
    [
      isInteractive,
      open,
      openMenu,
      closeMenu,
      commitValue,
      highlightedIndex,
      options,
      runTypeahead,
    ]
  );

  const handleContainerBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.relatedTarget as Node)
      ) {
        closeMenu();
      }
    },
    [closeMenu]
  );

  const triggerLabel = loading
    ? loadingLabel
    : selectedOption
      ? selectedOption.name
      : placeholder;

  return (
    <div
      ref={containerRef}
      onBlur={handleContainerBlur}
      className="relative"
    >
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-required={required}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-busy={loading}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleButtonKeyDown}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 text-left text-sm outline-none transition-all duration-150 ${
          invalid
            ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
            : "border-line/80 hover:border-line focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        } ${
          disabled
            ? "cursor-not-allowed bg-neutral-50 text-ink-faint"
            : "cursor-pointer text-ink"
        } ${open ? "border-brand-500 ring-2 ring-brand-500/20" : ""}`}
      >
        <span
          className={`truncate ${
            !selectedOption || loading ? "text-ink-faint" : "text-ink"
          }`}
        >
          {triggerLabel}
        </span>

        {loading ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-ink-faint"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-activedescendant={
            highlightedIndex >= 0
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
          className="absolute z-20 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-line/80 bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(17,17,17,0.18)] ring-1 ring-black/[0.03]"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-ink-faint">
              {emptyLabel}
            </li>
          ) : (
            options.map((option, index) => {
              const isSelected = option.id === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={option.id}
                  id={`${listboxId}-option-${index}`}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commitValue(option.id)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors duration-100 ${
                    isHighlighted ? "bg-brand-500/10" : ""
                  } ${isSelected ? "font-medium text-ink" : "text-ink"}`}
                >
                  <span className="truncate">{option.name}</span>

                  {isSelected && (
                    <Check
                      className="h-4 w-4 shrink-0 text-brand-500"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
});

export const ProductBasicInfo = memo(function ProductBasicInfo({
  productName,
  category,
  subCategory,
  description,
  slug,
  onProductNameChange,
  onCategoryChange,
  onSubCategoryChange,
  onDescriptionChange,
}: ProductBasicInfoProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);

  const [loadingCategory, setLoadingCategory] =
    useState(true);

  const [loadingSubCategory, setLoadingSubCategory] =
    useState(false);

  const [categoryError, setCategoryError] =
    useState<string | null>(null);

  const [subCategoryError, setSubCategoryError] =
    useState<string | null>(null);

  const isMountedRef = useRef(true);
  const categoryRequestId = useRef(0);
  const subCategoryRequestId = useRef(0);

  const productNameId = useId();
  const productNameHelpId = useId();
  const categoryId = useId();
  const categoryErrorId = useId();
  const subCategoryId = useId();
  const subCategoryHelpId = useId();
  const slugId = useId();
  const slugHelpId = useId();
  const descriptionId = useId();
  const descriptionHelpId = useId();

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ==========================================
  // Load Categories
  // ==========================================

  useEffect(() => {
    const requestId = ++categoryRequestId.current;

    setLoadingCategory(true);
    setCategoryError(null);

    async function loadCategories() {
      try {
        const data = await getCategories();

        if (
          !isMountedRef.current ||
          requestId !== categoryRequestId.current
        ) {
          return;
        }

        setCategories(data.categories);
      } catch (err) {
        if (
          !isMountedRef.current ||
          requestId !== categoryRequestId.current
        ) {
          return;
        }

        console.error(err);
        setCategoryError("Failed to load categories.");
      } finally {
        if (
          !isMountedRef.current ||
          requestId !== categoryRequestId.current
        ) {
          return;
        }

        setLoadingCategory(false);
      }
    }

    loadCategories();
  }, []);

  // ==========================================
  // Load Sub Categories
  // ==========================================

  useEffect(() => {
    if (!category) {
      setSubCategories([]);
      setSubCategoryError(null);
      setLoadingSubCategory(false);
      return;
    }

    const requestId = ++subCategoryRequestId.current;

    setLoadingSubCategory(true);
    setSubCategoryError(null);

    async function loadSubCategories() {
      try {
        const { subcategories } = await getSubCategories({
  category: category as number,
});

        if (
          !isMountedRef.current ||
          requestId !== subCategoryRequestId.current
        ) {
          return;
        }

        setSubCategories(subcategories);
      } catch (err) {
        if (
          !isMountedRef.current ||
          requestId !== subCategoryRequestId.current
        ) {
          return;
        }

        console.error(err);
        setSubCategoryError("Failed to load sub categories.");
      } finally {
        if (
          !isMountedRef.current ||
          requestId !== subCategoryRequestId.current
        ) {
          return;
        }

        setLoadingSubCategory(false);
      }
    }

    loadSubCategories();
  }, [category]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleProductNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onProductNameChange(e.target.value);
    },
    [onProductNameChange]
  );

  const handleProductNameBlur = useCallback(() => {
    const trimmed = productName.trim();

    if (trimmed !== productName) {
      onProductNameChange(trimmed);
    }
  }, [productName, onProductNameChange]);

  const handleCategorySelectChange = useCallback(
    (value: number | "") => {
      onCategoryChange(value);
      onSubCategoryChange("");
    },
    [onCategoryChange, onSubCategoryChange]
  );

  const handleSubCategorySelectChange = useCallback(
    (value: number | "") => {
      onSubCategoryChange(value);
    },
    [onSubCategoryChange]
  );

  const handleDescriptionChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onDescriptionChange(e.target.value);
    },
    [onDescriptionChange]
  );

  const handleDescriptionBlur = useCallback(() => {
    const trimmed = description.trim();

    if (trimmed !== description) {
      onDescriptionChange(trimmed);
    }
  }, [description, onDescriptionChange]);

  const noSubCategories =
    Boolean(category) &&
    !loadingSubCategory &&
    !subCategoryError &&
    subCategories.length === 0;

  return (
    <section className="rounded-2xl border border-line/70 bg-white shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(17,17,17,0.06)]">
      {/* Section header */}
      <div className="flex items-start gap-3 border-b border-line/70 px-5 py-5 sm:px-8 sm:py-6">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10">
          <Boxes
            className="h-[18px] w-[18px] text-brand-500"
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
            Product Information
          </h2>
          <p className="mt-0.5 text-sm text-ink-faint">
            The essentials buyers see first &mdash; name, category and
            description.
          </p>
        </div>
      </div>

      {/* Form body */}
      <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-7">
        {/* Product Name */}

        <div>
          <label
            htmlFor={productNameId}
            className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink"
          >
            Product Name
            <span className="text-brand-500" aria-hidden="true">
              *
            </span>
          </label>

          <Input
            id={productNameId}
            value={productName}
            onChange={handleProductNameChange}
            onBlur={handleProductNameBlur}
            required
            aria-required="true"
            aria-describedby={productNameHelpId}
            placeholder="Kajaria Ceramic Floor Tile"
            className="h-11 rounded-xl border-line/80 text-sm shadow-none transition-all duration-150 hover:border-line focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/20"
          />

          <p
            id={productNameHelpId}
            className="mt-1.5 text-xs leading-relaxed text-ink-faint"
          >
            Use the exact name buyers would search for &mdash; brand,
            material and variant help it get found.
          </p>
        </div>

        {/* Category + Sub Category */}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={categoryId}
              className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink"
            >
              Category
              <span className="text-brand-500" aria-hidden="true">
                *
              </span>
            </label>

            <PremiumCombobox
              id={categoryId}
              value={category}
              onChange={handleCategorySelectChange}
              options={categories}
              placeholder="Select category"
              loadingLabel="Loading categories..."
              loading={loadingCategory}
              required
              invalid={Boolean(categoryError)}
              describedBy={categoryError ? categoryErrorId : undefined}
              emptyLabel="No categories found"
            />

            {categoryError && (
              <p
                id={categoryErrorId}
                role="alert"
                className="mt-1.5 flex items-center gap-1 text-xs text-red-500"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {categoryError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={subCategoryId}
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Sub Category
            </label>

            <PremiumCombobox
              id={subCategoryId}
              value={subCategory}
              onChange={handleSubCategorySelectChange}
              options={subCategories}
              placeholder="Select sub category"
              loadingLabel="Loading subcategories..."
              loading={loadingSubCategory}
              disabled={!category}
              invalid={Boolean(subCategoryError)}
              describedBy={subCategoryHelpId}
              emptyLabel="No subcategories found"
            />

            <p
              id={subCategoryHelpId}
              className="mt-1.5 flex items-center gap-1 text-xs text-ink-faint"
            >
              {subCategoryError ? (
                <span role="alert" className="flex items-center gap-1 text-red-500">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {subCategoryError}
                </span>
              ) : noSubCategories ? (
                <>
                  <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  No subcategories available for this category
                </>
              ) : !category ? (
                "Choose a category first"
              ) : (
                "\u00A0"
              )}
            </p>
          </div>
        </div>

        {/* Slug */}

        <div>
          <label
            htmlFor={slugId}
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            URL Slug
          </label>

          <div className="flex h-11 items-center gap-2 rounded-xl border border-dashed border-line bg-neutral-50 px-3.5 transition-colors duration-150">
            <Link2 className="h-[15px] w-[15px] shrink-0 text-ink-faint" aria-hidden="true" />

            <input
              id={slugId}
              value={slug}
              readOnly
              tabIndex={-1}
              aria-readonly="true"
              aria-describedby={slugHelpId}
              className="h-full w-full truncate bg-transparent font-mono text-sm text-ink-faint outline-none"
              placeholder="kajaria-ceramic-floor-tile"
            />
          </div>

          <p id={slugHelpId} className="mt-1.5 text-xs text-ink-faint">
            Generated automatically from the product name.
          </p>
        </div>

        {/* Description */}

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor={descriptionId} className="text-sm font-medium text-ink">
              Description
            </label>

            <span className="shrink-0 text-xs tabular-nums text-ink-faint" aria-hidden="true">
              {description.length}/{DESCRIPTION_MAX_LENGTH}
            </span>
          </div>

          <textarea
            id={descriptionId}
            rows={5}
            value={description}
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
            maxLength={DESCRIPTION_MAX_LENGTH}
            aria-describedby={descriptionHelpId}
            className="w-full resize-y rounded-xl border border-line/80 p-3.5 text-sm leading-relaxed text-ink outline-none transition-all duration-150 hover:border-line placeholder:text-ink-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            placeholder="Describe the material, finish, dimensions and ideal application — e.g. tile size, thickness, or load rating..."
          />

          <p id={descriptionHelpId} className="mt-1.5 text-xs leading-relaxed text-ink-faint">
            A clear, specific description improves search ranking and buyer confidence.
          </p>
        </div>
      </div>
    </section>
  );
});