"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { addOrder, type AddOrderState } from "@/app/actions/orders";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/orders";
import { fieldClass, selectClass } from "@/lib/ui";

const initialState: AddOrderState = { success: false };
const labelClass = "mb-1.5 block text-sm font-semibold text-[var(--ink)]";

/**
 * Header action for the Orders page: an "Add order" button that opens the
 * create form in a right-side drawer (matching the Person / Lead detail
 * drawers), instead of an always-open form taking space above the table.
 * The drawer closes and a brief confirmation shows on a successful add; the
 * `addOrder` action revalidates `/admin/orders`, so the list refreshes on its
 * own. Validation errors keep the drawer open with the message inline.
 */
export function OrderForm() {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [state, formAction, pending] = useActionState(addOrder, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  // Fire only on the pending → done transition of a *successful* submit, so
  // repeated adds each close the drawer (a plain `state.success` dep would stay
  // true and never re-fire on the second submission).
  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      setOpen(false);
      setAdded(true);
      formRef.current?.reset();
      const t = setTimeout(() => setAdded(false), 3000);
      return () => clearTimeout(t);
    }
    wasPending.current = pending;
  }, [pending, state.success]);

  // Close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        <Plus size={16} strokeWidth={2.4} aria-hidden />
        Add order
      </button>

      {/* Backdrop */}
      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-[var(--ink)]/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Add an order"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col bg-[var(--paper)] shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] px-6 py-5">
          <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
            Add an order
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--gray-2)] transition hover:bg-[var(--cream)] hover:text-[var(--ink)]"
          >
            <X size={16} />
          </button>
        </div>

        <form
          ref={formRef}
          action={formAction}
          className="flex flex-1 flex-col overflow-y-auto px-6 py-6"
        >
          <p className="mb-5 text-sm text-[var(--gray-2)]">
            Record an order against an existing person by their email. It also
            appears on their record in People.
          </p>

          <div className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
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

          {state.error && (
            <p className="mt-4 rounded-lg bg-[var(--red-soft)] px-4 py-2.5 text-sm font-medium text-[var(--red)]">
              {state.error}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Adding…" : "Add order"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--gray-2)] transition hover:text-[var(--ink)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </aside>

      {/* Confirmation toast */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 right-6 z-50 rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-medium text-white shadow-2xl transition-all duration-200 ${
          added ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        Order added.
      </div>
    </>
  );
}
