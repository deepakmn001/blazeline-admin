"use client";

import {
  Check,
  ChevronDown,
  Loader2,
  Search,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import api from "@/lib/api";

type EntityType =
  | "category"
  | "subcategory"
  | "product"
  | "variant";

type Entity = {
  id: number;
  label: string;
  secondary?: string;
};

type ApiRecord = Record<string, unknown>;

type Props = {
  type: EntityType;
  value: number | null;
  onChange: (
    value: number | null,
    entity?: Entity
  ) => void;
  disabled?: boolean;
  categoryId?: number | null;
  placeholder?: string;
  error?: boolean;
};

const endpointMap: Record<EntityType, string> = {
  category: "/categories/",
  subcategory: "/subcategories/",
  product: "/products/",
  variant: "/product-variants/",
};

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 1;

function isObject(
  value: unknown
): value is ApiRecord {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function readString(
  value: unknown
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
}

function readNumber(
  value: unknown
): number | null {
  const number = Number(value);

  return Number.isInteger(number)
    ? number
    : null;
}

function normalizeResponse(
  data: unknown
): ApiRecord[] {
  if (Array.isArray(data)) {
    return data.filter(isObject);
  }

  if (
    isObject(data) &&
    Array.isArray(data.results)
  ) {
    return data.results.filter(isObject);
  }

  return [];
}

function normalizeItem(
  type: EntityType,
  item: ApiRecord
): Entity | null {
  const id = readNumber(item.id);

  if (!id || id <= 0) {
    return null;
  }

  switch (type) {
    case "category": {
      const name =
        readString(item.name) ??
        `Category #${id}`;

      const secondary =
        readString(item.group) ??
        readString(item.slug);

      return {
        id,
        label: name,
        secondary,
      };
    }

    case "subcategory": {
      const name =
        readString(item.name) ??
        `Subcategory #${id}`;

      let secondary =
        readString(item.category_name) ??
        readString(item.slug);

      if (
        !secondary &&
        isObject(item.category)
      ) {
        secondary =
          readString(item.category.name) ??
          readString(item.category.slug);
      }

      return {
        id,
        label: name,
        secondary,
      };
    }

    case "product": {
      const name =
        readString(item.name) ??
        `Product #${id}`;

      let secondary =
        readString(item.slug);

      if (
        !secondary &&
        isObject(item.category)
      ) {
        secondary =
          readString(item.category.name);
      }

      return {
        id,
        label: name,
        secondary,
      };
    }

    case "variant": {
      const sku =
        readString(item.sku);

      const name =
        readString(item.name) ??
        sku ??
        `Variant #${id}`;

      let secondary = sku;

      if (
        !secondary &&
        isObject(item.product)
      ) {
        secondary =
          readString(item.product.name);
      }

      return {
        id,
        label: name,
        secondary,
      };
    }

    default:
      return null;
  }
}

function getSearchLabel(
  type: EntityType
) {
  switch (type) {
    case "subcategory":
      return "subcategories";

    case "product":
      return "products";

    case "variant":
      return "variants";

    case "category":
    default:
      return "categories";
  }
}

export default function CatalogEntityPicker({
  type,
  value,
  onChange,
  disabled = false,
  categoryId = null,
  placeholder,
  error = false,
}: Props) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;

  const rootRef =
    useRef<HTMLDivElement | null>(null);

  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const optionRefs =
    useRef<Array<HTMLButtonElement | null>>(
      []
    );

  const requestSequence =
    useRef(0);

  const [open, setOpen] =
    useState(false);

  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState<Entity[]>([]);

  const [selected, setSelected] =
    useState<Entity | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [requestError, setRequestError] =
    useState(false);

  const [activeIndex, setActiveIndex] =
    useState(-1);

  const trimmedQuery = query.trim();

  const inputPlaceholder =
    placeholder ??
    `Search ${getSearchLabel(type)}...`;

  const activeOptionId =
    activeIndex >= 0 &&
    results[activeIndex]
      ? `${listboxId}-option-${results[activeIndex].id}`
      : undefined;

  const hasSearch =
    trimmedQuery.length >= MIN_SEARCH_LENGTH;

  const clearResults = useCallback(() => {
    setResults([]);
    setActiveIndex(-1);
    setRequestError(false);
  }, []);

  useEffect(() => {
    function handleOutsidePointerDown(
      event: PointerEvent
    ) {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener(
      "pointerdown",
      handleOutsidePointerDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsidePointerDown
      );
    };
  }, []);

  useEffect(() => {
    if (value === null || value === undefined) {
      setSelected(null);
      return;
    }

    const matched =
      results.find(
        (item) => item.id === value
      );

    if (matched) {
      setSelected(matched);
      return;
    }

    if (selected?.id !== value) {
      setSelected(null);
    }
  }, [value, results, selected?.id]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      clearResults();
    }
  }, [disabled, clearResults]);

  useEffect(() => {
    if (
      !open ||
      disabled ||
      !hasSearch
    ) {
      setLoading(false);

      if (!hasSearch) {
        clearResults();
      }

      return;
    }

    const controller =
      new AbortController();

    const sequence =
      ++requestSequence.current;

    const timer =
      window.setTimeout(async () => {
        try {
          setLoading(true);
          setRequestError(false);

          const params: Record<
            string,
            string | number
          > = {
            search: trimmedQuery,
          };

          if (
            type === "subcategory" &&
            categoryId
          ) {
            params.category = categoryId;
          }

          const response =
            await api.get(
              endpointMap[type],
              {
                params,
                signal: controller.signal,
              }
            );

          if (
            sequence !==
            requestSequence.current
          ) {
            return;
          }

          const normalized =
            normalizeResponse(
              response.data
            )
              .map((item) =>
                normalizeItem(type, item)
              )
              .filter(
                (
                  item
                ): item is Entity =>
                  item !== null
              );

          setResults(normalized);
          setActiveIndex(-1);
        } catch (error: unknown) {
          const isCanceled =
            isObject(error) &&
            (
              error.name ===
                "CanceledError" ||
              error.code ===
                "ERR_CANCELED"
            );

          if (isCanceled) {
            return;
          }

          console.error(
            `Failed to search ${type}:`,
            error
          );

          setResults([]);
          setActiveIndex(-1);
          setRequestError(true);
        } finally {
          if (
            sequence ===
            requestSequence.current
          ) {
            setLoading(false);
          }
        }
      }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    open,
    disabled,
    hasSearch,
    trimmedQuery,
    type,
    categoryId,
    clearResults,
  ]);

  function selectItem(item: Entity) {
    setSelected(item);
    onChange(item.id, item);

    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    setRequestError(false);
  }

  function clearSelection() {
    setSelected(null);
    onChange(null);

    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    setRequestError(false);

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function openPicker() {
    if (disabled) {
      return;
    }

    setOpen(true);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!results.length) {
        return;
      }

      setOpen(true);

      setActiveIndex((current) =>
        current < results.length - 1
          ? current + 1
          : 0
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!results.length) {
        return;
      }

      setOpen(true);

      setActiveIndex((current) =>
        current > 0
          ? current - 1
          : results.length - 1
      );

      return;
    }

    if (
      event.key === "Enter" &&
      open &&
      activeIndex >= 0 &&
      results[activeIndex]
    ) {
      event.preventDefault();
      selectItem(
        results[activeIndex]
      );
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (
      event.key === "Backspace" &&
      !query &&
      selected
    ) {
      event.preventDefault();
      clearSelection();
    }
  }

  useEffect(() => {
    if (
      activeIndex < 0 ||
      !optionRefs.current[activeIndex]
    ) {
      return;
    }

    optionRefs.current[
      activeIndex
    ]?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex]);

  const helperState = useMemo(() => {
    if (loading) {
      return "loading";
    }

    if (requestError) {
      return "error";
    }

    if (!hasSearch) {
      return "idle";
    }

    if (!results.length) {
      return "empty";
    }

    return "results";
  }, [
    loading,
    requestError,
    hasSearch,
    results.length,
  ]);

  return (
    <div
      ref={rootRef}
      className="relative w-full"
    >
      <div
        className={[
          "flex min-h-11 w-full items-center gap-2 rounded-xl border bg-white px-3 transition",
          disabled
            ? "cursor-not-allowed bg-slate-50 opacity-60"
            : "focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100",
          error
            ? "border-red-300"
            : "border-line",
        ].join(" ")}
      >
        <Search className="h-4 w-4 shrink-0 text-ink-muted" />

        {selected && (
          <span className="inline-flex max-w-[70%] min-w-0 items-center gap-1.5 rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
            <span className="truncate">
              {selected.label}
            </span>

            <button
              type="button"
              onClick={clearSelection}
              disabled={disabled}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-brand-600 transition hover:bg-brand-100 hover:text-brand-800 disabled:pointer-events-none"
              aria-label={`Clear ${selected.label}`}
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )}

        <input
          ref={inputRef}
          id={inputId}
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setRequestError(false);
            setActiveIndex(-1);
          }}
          onFocus={openPicker}
          onKeyDown={handleKeyDown}
          placeholder={
            selected
              ? "Search to replace..."
              : inputPlaceholder
          }
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeOptionId
          }
          aria-invalid={error}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted"
        />

        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" />
        ) : (
          <ChevronDown
            className={[
              "h-4 w-4 shrink-0 text-ink-muted transition-transform",
              open
                ? "rotate-180"
                : "",
            ].join(" ")}
          />
        )}
      </div>

      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-[60] mt-2 max-h-72 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
        >
          {helperState ===
            "loading" && (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              Searching...
            </div>
          )}

          {helperState ===
            "idle" && (
            <div className="px-3 py-5 text-center">
              <p className="text-sm font-semibold text-ink">
                Start typing to search
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                Search by name, SKU, barcode or
                another supported identifier.
              </p>
            </div>
          )}

          {helperState ===
            "error" && (
            <div className="px-3 py-5 text-center">
              <p className="text-sm font-semibold text-ink">
                Search unavailable
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                Please try again in a moment.
              </p>

              <button
                type="button"
                onClick={() => {
                  setRequestError(false);
                  setQuery(
                    (current) => current
                  );
                }}
                className="mt-3 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
              >
                Retry
              </button>
            </div>
          )}

          {helperState ===
            "empty" && (
            <div className="px-3 py-5 text-center">
              <p className="text-sm font-semibold text-ink">
                No results found
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                Try a different search term.
              </p>
            </div>
          )}

          {helperState ===
            "results" &&
            results.map(
              (item, index) => {
                const optionId = `${listboxId}-option-${item.id}`;
                const active =
                  index === activeIndex;
                const selectedOption =
                  value === item.id;

                return (
                  <button
                    key={item.id}
                    id={optionId}
                    ref={(element) => {
                      optionRefs.current[
                        index
                      ] = element;
                    }}
                    type="button"
                    role="option"
                    aria-selected={
                      selectedOption
                    }
                    onMouseDown={(event) =>
                      event.preventDefault()
                    }
                    onClick={() =>
                      selectItem(item)
                    }
                    className={[
                      "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                      active
                        ? "bg-brand-50"
                        : "hover:bg-canvas",
                    ].join(" ")}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-xs font-semibold text-ink">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {item.label}
                      </p>

                      {item.secondary && (
                        <p className="mt-0.5 truncate text-xs text-ink-muted">
                          {item.secondary}
                        </p>
                      )}
                    </div>

                    {selectedOption && (
                      <Check className="h-4 w-4 shrink-0 text-brand-600" />
                    )}
                  </button>
                );
              }
            )}
        </div>
      )}
    </div>
  );
}