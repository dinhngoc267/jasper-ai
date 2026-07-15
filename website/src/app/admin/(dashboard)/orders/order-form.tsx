"use client";

import { useActionState } from "react";
import { addOrder, type AddOrderState } from "@/app/actions/orders";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/orders";
import { fieldClass, selectClass } from "@/lib/ui";

const initialState: AddOrderState = { success: false };
const labelClass = "mb-1.5 block text-sm font-semibold text-[var(--ink)]";

export function OrderForm() {
  const [state, formAction, pending] = useActionState(addOrder, initialState);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-[var(--rule)] bg-[var(--paper)] p-6"
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--gray-2)]">
        Add an order
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="order-email" className={labelClass}>
            Person&apos;s email
          </label>
          <input
            id="order-email"
            name="email"
            type="email"
            required
            placeholder="ada@company.com"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="order-product" className={labelClass}>
            Product
          </label>
          <input
            id="order-product"
            name="product_name"
            type="text"
            required
            placeholder="AI Consulting — Discovery Sprint"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="order-amount" className={labelClass}>
            Amount
          </label>
          <input
            id="order-amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="5000.00"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="order-currency" className={labelClass}>
            Currency
          </label>
          <input
            id="order-currency"
            name="currency"
            type="text"
            defaultValue="usd"
            maxLength={3}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="order-status" className={labelClass}>
            Status
          </label>
          <select
            id="order-status"
            name="status"
            defaultValue="pending"
            className={selectClass}
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-5 rounded-full bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add order"}
      </button>

      {state.success && (
        <p className="mt-3 rounded-lg bg-[var(--blue-soft)] px-4 py-2.5 text-sm font-medium text-[var(--blue)]">
          Order added.
        </p>
      )}
      {state.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
