"use client";

import * as React from "react";
import {
  Check,
  Clipboard,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
  ShoppingCart,
  UserRound,
  MapPin,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";

import {
  createDirectOrder,
  createDirectOrderPaymentLink,
  getDirectOrders,
  type CreateDirectOrderRequest,
  type DirectOrderItemInput,
  type DirectOrderListItem,
} from "@/services/direct-order.service";

type DraftItem = DirectOrderItemInput & {
  localId: string;
};

const PAGE_SIZE = 25;

function createDraftItem(): DraftItem {
  return {
    localId: crypto.randomUUID(),
    product_name: "",
    sku: "",
    variant_name: "",
    quantity: 1,
    rate: "",
    discount_percent: "0",
    tax_rate: "18",
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function toNumber(value: string | number | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateItem(item: DraftItem) {
  const quantity = Math.max(0, toNumber(item.quantity));
  const rate = Math.max(0, toNumber(item.rate));
  const discountPercent = Math.min(
    100,
    Math.max(0, toNumber(item.discount_percent))
  );
  const taxRate = Math.min(
    100,
    Math.max(0, toNumber(item.tax_rate))
  );

  const gross = roundMoney(rate * quantity);
  const discount = roundMoney(
    (gross * discountPercent) / 100
  );
  const taxable = roundMoney(gross - discount);
  const tax = roundMoney(
    (taxable * taxRate) / 100
  );
  const total = roundMoney(taxable + tax);

  return {
    gross,
    discount,
    taxable,
    tax,
    total,
  };
}

function calculateSummary(
  items: DraftItem[],
  deliveryCharge: string
) {
  const calculated = items.map(calculateItem);

  const subtotal = roundMoney(
    calculated.reduce(
      (sum, item) => sum + item.gross,
      0
    )
  );

  const discount = roundMoney(
    calculated.reduce(
      (sum, item) => sum + item.discount,
      0
    )
  );

  const tax = roundMoney(
    calculated.reduce(
      (sum, item) => sum + item.tax,
      0
    )
  );

  const delivery = roundMoney(
    Math.max(0, toNumber(deliveryCharge))
  );

  const grandTotal = roundMoney(
    subtotal - discount + tax + delivery
  );

  return {
    calculated,
    subtotal,
    discount,
    tax,
    delivery,
    grandTotal,
  };
}

function extractErrorMessage(error: unknown) {
  const maybeError = error as {
    response?: {
      data?: {
        detail?: string;
        code?: string;
        [key: string]: unknown;
      };
    };
    message?: string;
  };

  return (
    maybeError?.response?.data?.detail ||
    maybeError?.message ||
    "Something went wrong."
  );
}

function StatusBadge({
  value,
}: {
  value: string;
}) {
  const normalized = value.toLowerCase();

  const styles =
    normalized === "paid" || normalized === "confirmed"
      ? "bg-emerald-50 text-emerald-700"
      : normalized === "pending" ||
          normalized === "pending_payment" ||
          normalized === "created" ||
          normalized === "active"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  const label = value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles}`}
    >
      {label}
    </span>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-[12px] font-semibold text-ink-soft">
      {children}
      {required ? (
        <span className="ml-1 text-red-500">*</span>
      ) : null}
    </label>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

export default function DirectOrdersPage() {
  const [customer, setCustomer] = React.useState({
    full_name: "",
    phone: "",
    email: "",
  });

  const [shipping, setShipping] =
    React.useState({
      full_name: "",
      phone: "",
      email: "",
      company: "",
      gstin: "",
      address_line1: "",
      address_line2: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
    });

  const [sameAsCustomer, setSameAsCustomer] =
    React.useState(true);

  const [items, setItems] = React.useState<
    DraftItem[]
  >([createDraftItem()]);

  const [deliveryCharge, setDeliveryCharge] =
    React.useState("0");

  const [notes, setNotes] = React.useState("");

  const [creating, setCreating] =
    React.useState(false);

  const [loadingOrders, setLoadingOrders] =
    React.useState(true);

  const [refreshingOrders, setRefreshingOrders] =
    React.useState(false);

  const [orders, setOrders] = React.useState<
    DirectOrderListItem[]
  >([]);

  const summary = React.useMemo(
    () =>
      calculateSummary(
        items,
        deliveryCharge
      ),
    [items, deliveryCharge]
  );

  const loadOrders = React.useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshingOrders(true);
      } else {
        setLoadingOrders(true);
      }

      try {
        const response = await getDirectOrders({
          page: 1,
          page_size: PAGE_SIZE,
        });

        setOrders(response.results);
      } catch (error) {
        console.error(error);
        toast.error(
          "Unable to load Direct Orders."
        );
      } finally {
        setLoadingOrders(false);
        setRefreshingOrders(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  React.useEffect(() => {
    if (!sameAsCustomer) return;

    setShipping((current) => ({
      ...current,
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email,
    }));
  }, [
    customer.full_name,
    customer.phone,
    customer.email,
    sameAsCustomer,
  ]);

  function updateItem(
    localId: string,
    patch: Partial<DraftItem>
  ) {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId
          ? { ...item, ...patch }
          : item
      )
    );
  }

  function removeItem(localId: string) {
    setItems((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (item) => item.localId !== localId
      );
    });
  }

  function resetForm() {
    setCustomer({
      full_name: "",
      phone: "",
      email: "",
    });

    setShipping({
      full_name: "",
      phone: "",
      email: "",
      company: "",
      gstin: "",
      address_line1: "",
      address_line2: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
    });

    setSameAsCustomer(true);
    setItems([createDraftItem()]);
    setDeliveryCharge("0");
    setNotes("");
  }

  function validateForm() {
    if (!customer.full_name.trim()) {
      toast.error("Customer name is required.");
      return false;
    }

    if (
      !customer.phone.trim() &&
      !customer.email.trim()
    ) {
      toast.error(
        "Enter customer phone or email."
      );
      return false;
    }

    if (!shipping.full_name.trim()) {
      toast.error(
        "Shipping/customer name is required."
      );
      return false;
    }

    if (!shipping.phone.trim()) {
      toast.error(
        "Shipping phone is required."
      );
      return false;
    }

    if (!shipping.email.trim()) {
      toast.error(
        "Shipping email is required."
      );
      return false;
    }

    if (!shipping.address_line1.trim()) {
      toast.error(
        "Address is required."
      );
      return false;
    }

    if (!shipping.city.trim()) {
      toast.error("City is required.");
      return false;
    }

    if (!shipping.state.trim()) {
      toast.error("State is required.");
      return false;
    }

    if (
      !/^\d{6}$/.test(
        shipping.pincode.trim()
      )
    ) {
      toast.error(
        "Enter a valid 6-digit pincode."
      );
      return false;
    }

    if (!items.length) {
      toast.error(
        "Add at least one product."
      );
      return false;
    }

    for (const item of items) {
      if (!item.product_name.trim()) {
        toast.error(
          "Every item needs a product name."
        );
        return false;
      }

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        toast.error(
          "Quantity must be at least 1."
        );
        return false;
      }

      if (
        item.rate === "" ||
        toNumber(item.rate) < 0
      ) {
        toast.error(
          "Enter a valid item rate."
        );
        return false;
      }
    }

    return true;
  }

  async function handleCreateOrder() {
    if (!validateForm()) return;

    setCreating(true);

    try {
      const payload: CreateDirectOrderRequest =
        {
          customer: {
            full_name:
              customer.full_name.trim(),
            phone:
              customer.phone.trim() || undefined,
            email:
              customer.email.trim() || undefined,
          },

          shipping: {
            full_name:
              shipping.full_name.trim(),
            phone:
              shipping.phone.trim(),
            email:
              shipping.email.trim(),
            company:
              shipping.company.trim(),
            gstin:
              shipping.gstin.trim().toUpperCase(),
            address_line1:
              shipping.address_line1.trim(),
            address_line2:
              shipping.address_line2.trim(),
            landmark:
              shipping.landmark.trim(),
            city: shipping.city.trim(),
            state: shipping.state.trim(),
            pincode:
              shipping.pincode.trim(),
          },

          items: items.map(
            ({ localId, ...item }) => ({
              ...item,
              product_name:
                item.product_name.trim(),
              sku:
                item.sku?.trim() || "",
              variant_name:
                item.variant_name?.trim() || "",
              rate:
                item.rate || "0",
              discount_percent:
                item.discount_percent || "0",
              tax_rate:
                item.tax_rate || "18",
            })
          ),

          delivery_charge:
            deliveryCharge || "0",

          currency: "INR",

          notes: notes.trim(),
        };

      const created = await createDirectOrder(
        payload
      );

      const orderNumber =
        created.order.order_number;

      toast.success(
        `Order ${orderNumber} created.`
      );

      try {
        const paymentLink =
          await createDirectOrderPaymentLink(
            orderNumber
          );

        const link =
          paymentLink.payment_link;

        await navigator.clipboard.writeText(
          link.short_url
        );

        toast.success(
          "Payment Link created and copied."
        );
      } catch (linkError) {
        console.error(linkError);

        toast.error(
          extractErrorMessage(linkError)
        );

        toast.info(
          "Order is created. You can generate the Payment Link again from the order list."
        );
      }

      resetForm();
      await loadOrders(true);
    } catch (error) {
      console.error(error);
      toast.error(
        extractErrorMessage(error)
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyPaymentLink(
    url: string
  ) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Payment Link copied.");
    } catch {
      toast.error(
        "Could not copy the Payment Link."
      );
    }
  }

  async function regeneratePaymentLink(
    orderNumber: string
  ) {
    try {
      const response =
        await createDirectOrderPaymentLink(
          orderNumber
        );

      await copyPaymentLink(
        response.payment_link.short_url
      );

      await loadOrders(true);
    } catch (error) {
      console.error(error);
      toast.error(
        extractErrorMessage(error)
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* ==========================================================
          HEADER
      ========================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            <ShoppingCart className="h-3.5 w-3.5" />
            Sales
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Direct Orders
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">
            Create manual customer orders for
            products that are not listed in the
            website
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadOrders(true)
          }
          disabled={
            loadingOrders ||
            refreshingOrders
          }
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-ink-soft shadow-sm transition hover:border-brand-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            className={`h-4 w-4 ${
              refreshingOrders
                ? "animate-spin"
                : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* ==========================================================
          BUILDER
      ========================================================== */}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {/* CUSTOMER */}

          <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-ink">
                  Customer
                </h2>
                <p className="mt-0.5 text-xs text-ink-faint">
                  Customer identity used for the order.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <FieldLabel required>
                  Full Name
                </FieldLabel>

                <input
                  value={customer.full_name}
                  onChange={(event) =>
                    setCustomer(
                      (current) => ({
                        ...current,
                        full_name:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Customer name"
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel>
                  Phone
                </FieldLabel>

                <input
                  value={customer.phone}
                  onChange={(event) =>
                    setCustomer(
                      (current) => ({
                        ...current,
                        phone:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="10-digit phone"
                  inputMode="numeric"
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel>
                  Email
                </FieldLabel>

                <input
                  value={customer.email}
                  onChange={(event) =>
                    setCustomer(
                      (current) => ({
                        ...current,
                        email:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="customer@email.com"
                  type="email"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* SHIPPING */}

          <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <MapPin className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-ink">
                    Shipping & Billing Details
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    These values are snapshotted into the order.
                  </p>
                </div>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-soft">
                <input
                  type="checkbox"
                  checked={sameAsCustomer}
                  onChange={(event) =>
                    setSameAsCustomer(
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                />
                Same as customer
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <FieldLabel required>
                  Full Name
                </FieldLabel>

                <input
                  value={
                    shipping.full_name
                  }
                  onChange={(event) =>
                    setShipping(
                      (current) => ({
                        ...current,
                        full_name:
                          event.target.value,
                      })
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel required>
                  Phone
                </FieldLabel>

                <input
                  value={shipping.phone}
                  onChange={(event) =>
                    setShipping(
                      (current) => ({
                        ...current,
                        phone:
                          event.target.value,
                      })
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel required>
                  Email
                </FieldLabel>

                <input
                  value={shipping.email}
                  onChange={(event) =>
                    setShipping(
                      (current) => ({
                        ...current,
                        email:
                          event.target.value,
                      })
                    )
                  }
                  type="email"
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel>
                  Company
                </FieldLabel>

                <input
                  value={shipping.company}
                  onChange={(event) =>
                    setShipping(
                      (current) => ({
                        ...current,
                        company:
                          event.target.value,
                      })
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel>
                  GSTIN
                </FieldLabel>

                <input
                  value={shipping.gstin}
                  onChange={(event) =>
                    setShipping(
                      (current) => ({
                        ...current,
                        gstin:
                          event.target.value.toUpperCase(),
                      })
                    )
                  }
                  maxLength={15}
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel required>
                  Pincode
                </FieldLabel>

                <input
                  value={shipping.pincode}
                  onChange={(event) =>
                    setShipping(
                      (current) => ({
                        ...current,
                        pincode:
                          event.target.value,
                      })
                    )
                  }
                  maxLength={6}
                  inputMode="numeric"
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-3">
                <FieldLabel required>
                  Address Line 1
                </FieldLabel>

                <input
                  value={
                    shipping.address_line1
                  }
                  onChange={(event) =>
                    setShipping(
                      (current) => ({
                        ...current,
                        address_line1:
                          event.target.value,
                      })
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-3">
                <FieldLabel>
                  Address Line 2
                </FieldLabel>

                <input
                  value={
                    shipping.address_line2
                  }
                  onChange={(event) =>
                    setShipping(
                      (current) => ({
                        ...current,
                        address_line2:
                          event.target.value,
                      })
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel>
                  Landmark
                </FieldLabel>

                <input
                  value={
                    shipping.landmark
                  }
                  onChange={(event) =>
                    setShipping(
                      (current) => ({
                        ...current,
                        landmark:
                          event.target.value,
                      })
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel required>
                  City
                </FieldLabel>

                <input
                  value={shipping.city}
                  onChange={(event) =>
                    setShipping(
                      (current) => ({
                        ...current,
                        city:
                          event.target.value,
                      })
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel required>
                  State
                </FieldLabel>

                <input
                  value={shipping.state}
                  onChange={(event) =>
                    setShipping(
                      (current) => ({
                        ...current,
                        state:
                          event.target.value,
                      })
                    )
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* ITEMS */}

          <section className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <ReceiptText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-ink">
                    Order Items
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    Add any offline/custom product.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    createDraftItem(),
                  ])
                }
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink-soft transition hover:border-brand-200 hover:text-brand-700"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-3 p-5">
              {items.map((item, index) => {
                const calculation =
                  calculateItem(item);

                return (
                  <div
                    key={item.localId}
                    className="rounded-2xl border border-line bg-slate-50/60 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                        Item {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeItem(
                            item.localId
                          )
                        }
                        disabled={
                          items.length === 1
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-12">
                      <div className="lg:col-span-4">
                        <FieldLabel required>
                          Product Name
                        </FieldLabel>

                        <input
                          value={
                            item.product_name
                          }
                          onChange={(event) =>
                            updateItem(
                              item.localId,
                              {
                                product_name:
                                  event.target.value,
                              }
                            )
                          }
                          placeholder="e.g. Wall Hung Toilet"
                          className={inputClass}
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <FieldLabel>
                          SKU
                        </FieldLabel>

                        <input
                          value={
                            item.sku || ""
                          }
                          onChange={(event) =>
                            updateItem(
                              item.localId,
                              {
                                sku:
                                  event.target.value,
                              }
                            )
                          }
                          placeholder="Optional"
                          className={inputClass}
                        />
                      </div>

                      <div className="lg:col-span-1">
                        <FieldLabel required>
                          Qty
                        </FieldLabel>

                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={
                            item.quantity
                          }
                          onChange={(event) =>
                            updateItem(
                              item.localId,
                              {
                                quantity:
                                  Math.max(
                                    1,
                                    Number(
                                      event.target
                                        .value || 1
                                    )
                                  ),
                              }
                            )
                          }
                          className={inputClass}
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <FieldLabel required>
                          Rate
                        </FieldLabel>

                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={
                            item.rate
                          }
                          onChange={(event) =>
                            updateItem(
                              item.localId,
                              {
                                rate:
                                  event.target
                                    .value,
                              }
                            )
                          }
                          placeholder="0.00"
                          className={inputClass}
                        />
                      </div>

                      <div className="lg:col-span-1">
                        <FieldLabel>
                          Disc %
                        </FieldLabel>

                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={
                            item.discount_percent
                          }
                          onChange={(event) =>
                            updateItem(
                              item.localId,
                              {
                                discount_percent:
                                  event.target
                                    .value,
                              }
                            )
                          }
                          className={inputClass}
                        />
                      </div>

                      <div className="lg:col-span-1">
                        <FieldLabel>
                          GST %
                        </FieldLabel>

                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={
                            item.tax_rate
                          }
                          onChange={(event) =>
                            updateItem(
                              item.localId,
                              {
                                tax_rate:
                                  event.target
                                    .value,
                              }
                            )
                          }
                          className={inputClass}
                        />
                      </div>

                      <div className="flex items-end lg:col-span-1">
                        <div className="w-full rounded-xl border border-line bg-white px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                            Total
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-ink">
                            {money(
                              calculation.total
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* NOTES */}

          <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <FieldLabel>
              Internal Notes
            </FieldLabel>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={4}
              maxLength={2000}
              placeholder="Optional order notes..."
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </section>
        </div>

        {/* ==========================================================
            SUMMARY
        ========================================================== */}

        <aside className="h-fit xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
            <div className="border-b border-line bg-slate-950 p-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                Order Summary
              </p>

              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {money(
                  summary.grandTotal
                )}
              </p>

              <p className="mt-1 text-xs text-white/55">
                Final amount is recalculated by
                the backend before payment.
              </p>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">
                  Subtotal
                </span>
                <span className="font-medium text-ink">
                  {money(summary.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">
                  Discount
                </span>
                <span className="font-medium text-emerald-600">
                  -{money(summary.discount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">
                  GST
                </span>
                <span className="font-medium text-ink">
                  {money(summary.tax)}
                </span>
              </div>

              <div>
                <FieldLabel>
                  Delivery Charge
                </FieldLabel>

                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={deliveryCharge}
                  onChange={(event) =>
                    setDeliveryCharge(
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div className="border-t border-dashed border-line pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">
                    Grand Total
                  </span>

                  <span className="text-xl font-semibold tracking-tight text-ink">
                    {money(
                      summary.grandTotal
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  void handleCreateOrder()
                }
                disabled={creating}
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Clipboard className="h-4 w-4" />
                    Create Payment Link
                  </>
                )}
              </button>

              <p className="text-center text-[11px] leading-5 text-ink-faint">
                Creates a normal BlazeLine
                order first, then generates its
                Razorpay Payment Link.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* ==========================================================
          RECENT DIRECT ORDERS
      ========================================================== */}

      <section className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Recent Direct Orders
            </h2>

            <p className="mt-0.5 text-xs text-ink-faint">
              Orders created from this admin
              workflow.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadOrders(true)
            }
            disabled={refreshingOrders}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink-soft transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-60"
          >
            <RefreshCcw
              className={`h-3.5 w-3.5 ${
                refreshingOrders
                  ? "animate-spin"
                  : ""
              }`}
            />
            Refresh
          </button>
        </div>

        {loadingOrders ? (
          <div className="flex items-center justify-center p-12 text-sm text-ink-faint">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading Direct Orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <ShoppingCart className="h-5 w-5" />
            </div>

            <p className="mt-3 text-sm font-semibold text-ink">
              No Direct Orders yet
            </p>

            <p className="mt-1 text-xs text-ink-faint">
              Your first manual customer order
              will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full">
              <thead>
                <tr className="border-b border-line bg-slate-50/70">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    Order
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    Customer
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    Amount
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    Payment
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    Order Status
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="transition hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-ink">
                        {order.order_number}
                      </p>

                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        {new Intl.DateTimeFormat(
                          "en-IN",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }
                        ).format(
                          new Date(
                            order.created_at
                          )
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-ink">
                        {order.customer
                          .full_name ||
                          "Customer"}
                      </p>

                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        {order.customer.phone ||
                          order.customer.email ||
                          "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-ink">
                        {money(
                          toNumber(
                            order.grand_total
                          )
                        )}
                      </p>

                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        {order.item_count}{" "}
                        {order.item_count === 1
                          ? "item"
                          : "items"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        value={
                          order.payment_status
                        }
                      />

                      {order.payment_link ? (
                        <p className="mt-1 text-[11px] text-ink-faint">
                          {order.payment_link.status}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        value={
                          order.status
                        }
                      />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {order.payment_link ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                void copyPaymentLink(
                                  order
                                    .payment_link!
                                    .short_url
                                )
                              }
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink-soft transition hover:border-brand-200 hover:text-brand-700"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </button>

                            <a
                              href={
                                order
                                  .payment_link
                                  .short_url
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink-soft transition hover:border-brand-200 hover:text-brand-700"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              void regeneratePaymentLink(
                                order.order_number
                              )
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink-soft transition hover:border-brand-200 hover:text-brand-700"
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                            Create Link
                          </button>
                        )}

                        {order.payment_status ===
                        "paid" ? (
                          <span className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            Paid
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}