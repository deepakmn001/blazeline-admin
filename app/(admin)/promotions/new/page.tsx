"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Info,
  Layers3,
  Loader2,
  Plus,
  ShieldCheck,
  Tag,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "@/lib/api";
import CatalogEntityPicker from "@/components/promotions/catalog-entity-picker";

type DiscountType = "percentage" | "fixed_amount";

type TargetType =
  | "ALL"
  | "CATEGORY"
  | "SUBCATEGORY"
  | "BRAND"
  | "PRODUCT"
  | "VARIANT";
type BrandOption = {
  value: string;
  label: string;
  count: number;
};
type RuleDraft = {
  localId: string;
  targetType: TargetType;
  category: string;
  subcategory: string;
  brand: string;
  product: string;
  variant: string;
};

type FormState = {
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  maxDiscountAmount: string;
  minimumCartValue: string;
  isActive: boolean;
  startAt: string;
  endAt: string;
  priority: string;
  stackable: boolean;
};

type FieldErrors = Partial<
  Record<keyof FormState, string>
>;

const TARGET_OPTIONS: Array<{
  value: TargetType;
  label: string;
  description: string;
}> = [
  {
    value: "ALL",
    label: "All products",
    description:
      "Apply this promotion across the catalog.",
  },
  {
    value: "CATEGORY",
    label: "Category",
    description:
      "Target every product in one category.",
  },
  {
    value: "SUBCATEGORY",
    label: "Subcategory",
    description:
      "Target products in one subcategory.",
  },
  {
    value: "BRAND",
    label: "Brand",
    description:
      "Target products belonging to one brand.",
  },
  {
    value: "PRODUCT",
    label: "Product",
    description:
      "Target all variants belonging to one product.",
  },
  {
    value: "VARIANT",
    label: "Variant",
    description:
      "Target one exact sellable variant.",
  },
];
function formatCurrency(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function createRule(): RuleDraft {
  return {
    localId: `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    targetType: "ALL",
    category: "",
    subcategory: "",
    brand: "",
    product: "",
    variant: "",
  };
}

function getLocalDateTimeString(
  date = new Date()
) {
  const offset = date.getTimezoneOffset();
  const local = new Date(
    date.getTime() - offset * 60_000
  );

  return local.toISOString().slice(0, 16);
}

function formatApiDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
}

function toNumber(value: string) {
  const number = Number(value);

  return Number.isFinite(number) ? number : NaN;
}

function buildRulePayload(rule: RuleDraft) {
  switch (rule.targetType) {
    case "ALL":
      return {
        target_type: "ALL",
      };

    case "CATEGORY":
      return {
        target_type: "CATEGORY",
        category: Number(rule.category),
      };

    case "SUBCATEGORY":
      return {
        target_type: "SUBCATEGORY",
        subcategory: Number(rule.subcategory),
      };

    case "BRAND":
      return {
        target_type: "BRAND",
        brand: rule.brand.trim(),
      };

    case "PRODUCT":
      return {
        target_type: "PRODUCT",
        product: Number(rule.product),
      };

    case "VARIANT":
      return {
        target_type: "VARIANT",
        variant: Number(rule.variant),
      };

    default:
      return {
        target_type: rule.targetType,
      };
  }
}

export default function CreatePromotionPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    maxDiscountAmount: "",
    minimumCartValue: "0",
    isActive: true,
    startAt: getLocalDateTimeString(),
    endAt: getLocalDateTimeString(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ),
    priority: "100",
    stackable: false,
  });

  const [rules, setRules] = useState<RuleDraft[]>([
    createRule(),
  ]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
const [brandsLoading, setBrandsLoading] = useState(false);
const [brandsError, setBrandsError] = useState("");

useEffect(() => {
  let cancelled = false;

  async function loadBrands() {
    setBrandsLoading(true);
    setBrandsError("");

    try {
      const response = await api.get("/products/facets/");

      const brandFilter = response.data?.filters?.find(
        (filter: { key?: string }) => filter.key === "brand"
      );

      const values = Array.isArray(brandFilter?.values)
        ? brandFilter.values
        : [];

      if (!cancelled) {
        setBrands(values);
      }
    } catch (error) {
      console.error("Failed to load brands:", error);

      if (!cancelled) {
        setBrandsError("Unable to load brands.");
      }
    } finally {
      if (!cancelled) {
        setBrandsLoading(false);
      }
    }
  }

  loadBrands();

  return () => {
    cancelled = true;
  };
}, []);

  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  const [ruleErrors, setRuleErrors] = useState<
    Record<string, string>
  >({});

  const [submitError, setSubmitError] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [createdPromotionId, setCreatedPromotionId] =
    useState<number | null>(null);

  const discountPreview = useMemo(() => {
    const value = toNumber(form.discountValue);

    if (!Number.isFinite(value) || value <= 0) {
      return "Enter a valid discount to preview the offer.";
    }

    if (form.discountType === "percentage") {
      return `${value}% OFF`;
    }

    return `₹${value.toLocaleString(
      "en-IN"
    )} OFF`;
  }, [
    form.discountType,
    form.discountValue,
  ]);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setSubmitError("");
  }

  function updateRule(
    localId: string,
    patch: Partial<RuleDraft>
  ) {
    setRules((current) =>
      current.map((rule) =>
        rule.localId === localId
          ? {
              ...rule,
              ...patch,
            }
          : rule
      )
    );

    setRuleErrors((current) => {
      const next = { ...current };
      delete next[localId];
      return next;
    });

    setSubmitError("");
  }

  function addRule() {
    setRules((current) => [
      ...current,
      createRule(),
    ]);
  }

  function removeRule(localId: string) {
    setRules((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (rule) => rule.localId !== localId
      );
    });

    setRuleErrors((current) => {
      const next = { ...current };
      delete next[localId];
      return next;
    });
  }

  function validateForm() {
    const errors: FieldErrors = {};
    const nextRuleErrors: Record<
      string,
      string
    > = {};

    const name = form.name.trim();

    if (!name) {
      errors.name = "Promotion name is required.";
    } else if (name.length < 3) {
      errors.name =
        "Promotion name must be at least 3 characters.";
    } else if (name.length > 255) {
      errors.name =
        "Promotion name cannot exceed 255 characters.";
    }

    const discountValue = toNumber(
      form.discountValue
    );

    if (
      !form.discountValue ||
      !Number.isFinite(discountValue)
    ) {
      errors.discountValue =
        "Enter a valid discount value.";
    } else if (discountValue <= 0) {
      errors.discountValue =
        "Discount value must be greater than 0.";
    } else if (
      form.discountType === "percentage" &&
      discountValue > 100
    ) {
      errors.discountValue =
        "Percentage discount cannot exceed 100%.";
    }

    const minimumCartValue = toNumber(
      form.minimumCartValue
    );

    if (
      !Number.isFinite(minimumCartValue) ||
      minimumCartValue < 0
    ) {
      errors.minimumCartValue =
        "Minimum cart value must be 0 or greater.";
    }

    if (
      form.maxDiscountAmount.trim() !== ""
    ) {
      const maxDiscount = toNumber(
        form.maxDiscountAmount
      );

      if (
        !Number.isFinite(maxDiscount) ||
        maxDiscount <= 0
      ) {
        errors.maxDiscountAmount =
          "Maximum discount must be greater than 0.";
      }
    }

    const priority = toNumber(form.priority);

    if (
      !Number.isInteger(priority) ||
      priority < 0
    ) {
      errors.priority =
        "Priority must be a whole number 0 or greater.";
    }

    if (!form.startAt) {
      errors.startAt =
        "Start date and time is required.";
    }

    if (!form.endAt) {
      errors.endAt =
        "End date and time is required.";
    }

    if (form.startAt && form.endAt) {
      const start = new Date(
        form.startAt
      ).getTime();

      const end = new Date(
        form.endAt
      ).getTime();

      if (
        !Number.isNaN(start) &&
        !Number.isNaN(end) &&
        start >= end
      ) {
        errors.endAt =
          "End date must be after start date.";
      }
    }

    rules.forEach((rule) => {
      switch (rule.targetType) {
        case "CATEGORY": {
          const id = toNumber(rule.category);

          if (
            !rule.category ||
            !Number.isInteger(id) ||
            id <= 0
          ) {
            nextRuleErrors[rule.localId] =
  "Please select a category.";
          }
          break;
        }

        case "SUBCATEGORY": {
          const id = toNumber(
            rule.subcategory
          );

          if (
            !rule.subcategory ||
            !Number.isInteger(id) ||
            id <= 0
          ) {
            nextRuleErrors[rule.localId] =
  "Please select a subcategory.";
          }
          break;
        }

        case "BRAND":
          if (!rule.brand.trim()) {
            nextRuleErrors[rule.localId] =
              "Brand is required.";
          }
          break;

        case "PRODUCT": {
          const id = toNumber(rule.product);

          if (
            !rule.product ||
            !Number.isInteger(id) ||
            id <= 0
          ) {
            nextRuleErrors[rule.localId] =
  "Please select a product.";
          }
          break;
        }

        case "VARIANT": {
          const id = toNumber(rule.variant);

          if (
            !rule.variant ||
            !Number.isInteger(id) ||
            id <= 0
          ) {
            nextRuleErrors[rule.localId] =
  "Please select a variant.";
          }
          break;
        }

        case "ALL":
        default:
          break;
      }
    });

    setFieldErrors(errors);
    setRuleErrors(nextRuleErrors);

    return (
      Object.keys(errors).length === 0 &&
      Object.keys(nextRuleErrors).length === 0
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmitError("");

    const valid = validateForm();

    if (!valid) {
      return;
    }

    setIsSubmitting(true);

    let promotionId: number | null =
      null;
      const createdRuleIds: number[] = [];

    try {
      const promotionPayload = {
        name: form.name.trim(),
        description:
          form.description.trim(),
        discount_type:
  form.discountType === "percentage"
    ? "PERCENTAGE"
    : "FIXED_AMOUNT",
        discount_value: Number(
          form.discountValue
        ),
        max_discount_amount:
          form.maxDiscountAmount.trim() === ""
            ? null
            : Number(form.maxDiscountAmount),
        minimum_cart_value: Number(
          form.minimumCartValue
        ),
        is_active: form.isActive,
        start_at: formatApiDateTime(
          form.startAt
        ),
        end_at: formatApiDateTime(
          form.endAt
        ),
        priority: Number(form.priority),
        stackable: form.stackable,
      };

      const promotionResponse =
        await api.post(
          "/promotions/",
          promotionPayload
        );

      promotionId =
        promotionResponse.data?.id ?? null;

      if (!promotionId) {
        throw new Error(
          "Promotion was created but no promotion ID was returned."
        );
      }

      setCreatedPromotionId(
        promotionId
      );

      for (const rule of rules) {
  const ruleResponse = await api.post(
    "/promotion-rules/",
    {
      promotion: promotionId,
      ...buildRulePayload(rule),
    }
  );

  if (ruleResponse.data?.id) {
    createdRuleIds.push(
      Number(ruleResponse.data.id)
    );
  }
}

      router.push("/promotions");
      router.refresh();
    } catch (error: any) {
      console.error(
        "Promotion creation failed:",
        error
      );

      const apiErrors =
        error?.response?.data;

      let message =
        "Unable to create the promotion. Please review the form and try again.";

      if (
        typeof apiErrors === "object" &&
        apiErrors !== null
      ) {
        const firstFieldError =
          Object.entries(apiErrors)
            .flatMap(([, value]) => {
              if (Array.isArray(value)) {
                return value;
              }

              return [value];
            })
            .find(
              (value) =>
                typeof value === "string"
            );

        if (firstFieldError) {
          message = firstFieldError;
        }
      }

      setSubmitError(message);

      /*
       * Compensation:
       * If the promotion itself was created but
       * one of its rules failed, attempt to remove
       * the orphan promotion.
       */
      if (createdRuleIds.length > 0) {
  await Promise.allSettled(
    createdRuleIds.map((ruleId) =>
      api.delete(
        `/promotion-rules/${ruleId}/`
      )
    )
  );
}

if (promotionId) {
  try {
    await api.delete(
      `/promotions/${promotionId}/`
    );
  } catch (rollbackError) {
    console.error(
      "Promotion rollback failed:",
      rollbackError
    );

    setSubmitError(
      `${message} The promotion could not be fully rolled back and may require manual review.`
    );
  }
}
    } finally {
      setCreatedPromotionId(null);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-full space-y-7">
      {/* Header */}
      <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-muted">
            <Link
              href="/promotions"
              className="transition hover:text-brand-600"
            >
              Marketing
            </Link>

            <span>/</span>

            <Link
              href="/promotions"
              className="transition hover:text-brand-600"
            >
              Promotions
            </Link>

            <span>/</span>

            <span>New</span>
          </div>

          <div className="flex items-start gap-3">
            <Link
              href="/promotions"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-muted transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              aria-label="Back to promotions"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                Create Promotion
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-ink-muted">
                Configure a controlled, server-validated
                BlazeLine discount campaign.
              </p>
            </div>
          </div>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Admin-only promotion management
        </div>
      </section>

      {/* Error */}
      {submitError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />

          <div className="flex-1">
            <p className="font-semibold">
  Couldn&apos;t create promotion
</p>

            <p className="mt-0.5 text-red-700">
              {submitError}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setSubmitError("")
            }
            className="text-red-500 transition hover:text-red-700"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        {/* Main form */}
        <div className="space-y-6">
          {/* Basic information */}
          <section className="rounded-2xl border border-line bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <SectionHeader
              icon={Tag}
              title="Basic information"
              description="Give the campaign a clear internal identity."
            />

            <div className="grid gap-5 p-5 sm:p-6">
              <Field
                label="Promotion name"
                required
                error={fieldErrors.name}
              >
                <input
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                  placeholder="e.g. Monsoon Material Sale"
                  maxLength={255}
                  className={inputClass(
                    Boolean(fieldErrors.name)
                  )}
                />
              </Field>

              <Field
                label="Description"
                hint="Optional internal description."
              >
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Describe what this promotion is intended for..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-line bg-canvas px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </Field>
            </div>
          </section>

          {/* Discount */}
          <section className="rounded-2xl border border-line bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <SectionHeader
              icon={CircleDollarSign}
              title="Discount configuration"
              description="Define the exact commercial discount rules."
            />

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <Field label="Discount type" required>
                <div className="relative">
                  <select
                    value={form.discountType}
                    onChange={(event) =>
                      updateField(
                        "discountType",
                        event.target
                          .value as DiscountType
                      )
                    }
                    className="h-11 w-full appearance-none rounded-xl border border-line bg-canvas px-3.5 pr-10 text-sm font-medium text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="percentage">
                      Percentage
                    </option>
                    <option value="fixed_amount">
                      Fixed amount
                    </option>
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                </div>
              </Field>

              <Field
                label={
                  form.discountType ===
                  "percentage"
                    ? "Discount percentage"
                    : "Discount amount"
                }
                required
                error={fieldErrors.discountValue}
              >
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discountValue}
                    onChange={(event) =>
                      updateField(
                        "discountValue",
                        event.target.value
                      )
                    }
                    placeholder={
                      form.discountType ===
                      "percentage"
                        ? "10"
                        : "500"
                    }
                    className={`${inputClass(
                      Boolean(
                        fieldErrors.discountValue
                      )
                    )} ${
                      form.discountType ===
                      "percentage"
                        ? "pr-12"
                        : "pr-12"
                    }`}
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted">
                    {form.discountType ===
                    "percentage"
                      ? "%"
                      : "INR"}
                  </span>
                </div>
              </Field>

              <Field
                label="Maximum discount"
                hint="Optional cap. Leave empty for no cap."
                error={
                  fieldErrors.maxDiscountAmount
                }
              >
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.maxDiscountAmount
                    }
                    onChange={(event) =>
                      updateField(
                        "maxDiscountAmount",
                        event.target.value
                      )
                    }
                    placeholder="5000"
                    className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 pr-14 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted">
                    INR
                  </span>
                </div>
              </Field>

              <Field
                label="Minimum cart value"
                required
                error={
                  fieldErrors.minimumCartValue
                }
              >
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.minimumCartValue
                    }
                    onChange={(event) =>
                      updateField(
                        "minimumCartValue",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 pr-14 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted">
                    INR
                  </span>
                </div>
              </Field>
            </div>
          </section>

          {/* Schedule */}
          <section className="rounded-2xl border border-line bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <SectionHeader
              icon={CalendarClock}
              title="Validity & priority"
              description="Control when the promotion can run and how it competes with others."
            />

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <Field
                label="Start date & time"
                required
                error={fieldErrors.startAt}
              >
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(event) =>
                    updateField(
                      "startAt",
                      event.target.value
                    )
                  }
                  className={inputClass(
                    Boolean(fieldErrors.startAt)
                  )}
                />
              </Field>

              <Field
                label="End date & time"
                required
                error={fieldErrors.endAt}
              >
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(event) =>
                    updateField(
                      "endAt",
                      event.target.value
                    )
                  }
                  className={inputClass(
                    Boolean(fieldErrors.endAt)
                  )}
                />
              </Field>

              <Field
                label="Priority"
                required
                hint="Higher values are evaluated first."
                error={fieldErrors.priority}
              >
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.priority}
                  onChange={(event) =>
                    updateField(
                      "priority",
                      event.target.value
                    )
                  }
                  className={inputClass(
                    Boolean(fieldErrors.priority)
                  )}
                />
              </Field>

              <div className="rounded-xl border border-line bg-canvas p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Promotion status
                    </p>

                    <p className="mt-1 text-xs leading-5 text-ink-muted">
                      Inactive promotions remain stored but
                      cannot participate in checkout pricing.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "isActive",
                        !form.isActive
                      )
                    }
                    aria-pressed={form.isActive}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      form.isActive
                        ? "bg-brand-600"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                        form.isActive
                          ? "left-6"
                          : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      form.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-slate-600"
                    }`}
                  >
                    {form.isActive
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Rules */}
          <section className="rounded-2xl border border-line bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <SectionHeader
              icon={Layers3}
              title="Targeting rules"
              description="Choose exactly which catalog scope this promotion applies to."
              action={
                <button
                  type="button"
                  onClick={addRule}
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add rule
                </button>
              }
            />

            <div className="space-y-4 p-5 sm:p-6">
              {rules.map((rule, index) => {
                const target =
                  TARGET_OPTIONS.find(
                    (option) =>
                      option.value ===
                      rule.targetType
                  );

                const error =
                  ruleErrors[rule.localId];

                return (
                  <div
                    key={rule.localId}
                    className="rounded-2xl border border-line bg-canvas/60 p-4"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <span className="text-xs font-bold">
                            {index + 1}
                          </span>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-ink">
                            Targeting rule {index + 1}
                          </p>

                          <p className="text-xs text-ink-muted">
                            {target?.description}
                          </p>
                        </div>
                      </div>

                      {rules.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeRule(
                              rule.localId
                            )
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Target type">
                        <div className="relative">
                          <select
                            value={
                              rule.targetType
                            }
                            onChange={(event) =>
                              updateRule(
                                rule.localId,
                                {
                                  targetType:
                                    event.target
                                      .value as TargetType,
                                  category: "",
                                  subcategory:
                                    "",
                                  brand: "",
                                  product: "",
                                  variant: "",
                                }
                              )
                            }
                            className="h-11 w-full appearance-none rounded-xl border border-line bg-white px-3.5 pr-10 text-sm font-medium text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                          >
                            {TARGET_OPTIONS.map(
                              (option) => (
                                <option
                                  key={
                                    option.value
                                  }
                                  value={
                                    option.value
                                  }
                                >
                                  {option.label}
                                </option>
                              )
                            )}
                          </select>

                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        </div>
                      </Field>

                      {rule.targetType === "CATEGORY" && (
  <Field
    label="Category"
    required
    error={error}
  >
    <CatalogEntityPicker
      type="category"
      value={
        rule.category
          ? Number(rule.category)
          : null
      }
      onChange={(id) =>
        updateRule(rule.localId, {
          category: id ? String(id) : "",
          subcategory: "",
        })
      }
      error={Boolean(error)}
      placeholder="Search categories..."
    />
  </Field>
)}

{rule.targetType === "SUBCATEGORY" && (
  <Field
    label="Subcategory"
    required
    error={error}
  >
    <CatalogEntityPicker
      type="subcategory"
      value={
        rule.subcategory
          ? Number(rule.subcategory)
          : null
      }
      categoryId={
        rule.category
          ? Number(rule.category)
          : null
      }
      onChange={(id) =>
        updateRule(rule.localId, {
          subcategory: id
            ? String(id)
            : "",
        })
      }
      error={Boolean(error)}
      placeholder={
        rule.category
          ? "Search subcategories..."
          : "Select a category first..."
      }
      disabled={!rule.category}
    />
  </Field>
)}

{rule.targetType === "BRAND" && (
  <Field
    label="Brand"
    required
    error={error}
    hint="Select a brand from your catalog."
  >
    <div className="relative">
      <select
        value={rule.brand}
        onChange={(event) =>
          updateRule(rule.localId, {
            brand: event.target.value,
          })
        }
        disabled={brandsLoading}
        className={inputClass(Boolean(error))}
      >
        <option value="">
          {brandsLoading
            ? "Loading brands..."
            : brands.length
              ? "Select a brand..."
              : "No brands found"}
        </option>

        {brands.map((brand) => (
          <option key={brand.value} value={brand.value}>
            {brand.label} ({brand.count})
          </option>
        ))}
      </select>
    </div>

    {brandsError && (
      <p className="mt-1.5 text-xs font-medium text-red-600">
        {brandsError}
      </p>
    )}
  </Field>
)}
{rule.targetType === "PRODUCT" && (
  <Field
    label="Product"
    required
    error={error}
  >
    <CatalogEntityPicker
      type="product"
      value={
        rule.product
          ? Number(rule.product)
          : null
      }
      onChange={(id) =>
        updateRule(rule.localId, {
          product: id ? String(id) : "",
        })
      }
      error={Boolean(error)}
      placeholder="Search products..."
    />
  </Field>
)}

{rule.targetType === "VARIANT" && (
  <Field
    label="Variant"
    required
    error={error}
  >
    <CatalogEntityPicker
      type="variant"
      value={
        rule.variant
          ? Number(rule.variant)
          : null
      }
      onChange={(id) =>
        updateRule(rule.localId, {
          variant: id ? String(id) : "",
        })
      }
      error={Boolean(error)}
      placeholder="Search SKU, product or barcode..."
    />
  </Field>
)}
                    </div>

                    {error && (
                      <p className="mt-3 text-xs font-medium text-red-600">
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Advanced */}
          <section className="rounded-2xl border border-line bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <SectionHeader
              icon={Zap}
              title="Advanced settings"
              description="Control how this promotion interacts with other discounts."
            />

            <div className="p-5 sm:p-6">
              <div className="rounded-xl border border-line bg-canvas p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Allow stacking
                    </p>

                    <p className="mt-1 max-w-xl text-xs leading-5 text-ink-muted">
                      Allow this promotion to combine with
                      other eligible stackable promotions.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "stackable",
                        !form.stackable
                      )
                    }
                    aria-pressed={form.stackable}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      form.stackable
                        ? "bg-brand-600"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                        form.stackable
                          ? "left-6"
                          : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      form.stackable
                        ? "border-brand-200 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-slate-100 text-slate-600"
                    }`}
                  >
                    {form.stackable
                      ? "Stackable"
                      : "Non-stackable"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Footer actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href="/promotions"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating promotion...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create promotion
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          {/* Preview */}
          <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="border-b border-line p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Live preview
              </p>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                    <Tag className="h-5 w-5" />
                  </div>

                  <span className="rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                    {form.isActive
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>

                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                  BlazeLine promotion
                </p>

                <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">
                  {form.name.trim() ||
                    "Your promotion name"}
                </h3>

                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  {form.description.trim() ||
                    "Your internal promotion description will appear here."}
                </p>

                <div className="mt-5 rounded-xl border border-brand-100 bg-white p-4">
                  <p className="text-xs text-ink-muted">
                    Customer offer
                  </p>

                  <p className="mt-1 text-2xl font-semibold tracking-tight text-brand-700">
                    {discountPreview}
                  </p>

                  <p className="mt-2 text-xs text-ink-muted">
                    Minimum cart{" "}
                    {formatCurrency(
                      form.minimumCartValue
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Summary */}
          <section className="rounded-2xl border border-line bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="border-b border-line p-5">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-brand-600" />
                <h3 className="text-sm font-semibold text-ink">
                  Campaign summary
                </h3>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <SummaryRow
                label="Start"
                value={
                  form.startAt
                    ? new Date(
                        form.startAt
                      ).toLocaleString(
                        "en-IN",
                        {
                          dateStyle:
                            "medium",
                          timeStyle:
                            "short",
                        }
                      )
                    : "—"
                }
              />

              <SummaryRow
                label="End"
                value={
                  form.endAt
                    ? new Date(
                        form.endAt
                      ).toLocaleString(
                        "en-IN",
                        {
                          dateStyle:
                            "medium",
                          timeStyle:
                            "short",
                        }
                      )
                    : "—"
                }
              />

              <SummaryRow
                label="Priority"
                value={form.priority || "—"}
              />

              <SummaryRow
                label="Rules"
                value={`${rules.length}`}
              />

              <SummaryRow
                label="Stacking"
                value={
                  form.stackable
                    ? "Allowed"
                    : "Disabled"
                }
              />
            </div>
          </section>

          {/* Safety note */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

              <div>
                <p className="text-xs font-semibold text-amber-900">
                  Server-side pricing remains authoritative
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-800">
                  This panel only defines the promotion.
                  Checkout pricing is still calculated and
                  validated by the BlazeLine backend.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Tag;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="h-4 w-4" />
        </div>

        <div>
          <h2 className="text-base font-semibold text-ink">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-5 text-ink-muted">
            {description}
          </p>
        </div>
      </div>

      {action}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-ink">
          {label}
          {required && (
            <span className="ml-1 text-brand-600">
              *
            </span>
          )}
        </label>

        {hint && (
          <span className="text-[11px] text-ink-muted">
            {hint}
          </span>
        )}
      </div>

      {children}

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-ink-muted">
        {label}
      </span>

      <span className="max-w-[210px] text-right text-xs font-semibold text-ink">
        {value}
      </span>
    </div>
  );
}

function inputClass(hasError = false) {
  return [
    "h-11 w-full rounded-xl border bg-canvas px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:ring-2",
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-line focus:border-brand-400 focus:ring-brand-100",
  ].join(" ");
}