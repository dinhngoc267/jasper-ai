"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { PERIODS, PERIOD_META, type Period } from "@/lib/period";

/**
 * Week / Month / Quarter segmented control. Writes the choice to `?period=` so
 * the dashboard stays server-rendered and the view is shareable; the server
 * page reads the param and recomputes every windowed metric. Kept client-side
 * only for the click handler — no data lives here.
 */
export function PeriodToggle({ current }: { current: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function select(period: Period) {
    if (period === current) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      className={`inline-flex rounded-[10px] border border-[var(--rule)] bg-[var(--paper)] p-0.5 transition-opacity ${
        isPending ? "opacity-60" : ""
      }`}
      role="group"
      aria-label="Time period"
    >
      {PERIODS.map((period) => {
        const active = period === current;
        return (
          <button
            key={period}
            type="button"
            aria-pressed={active}
            onClick={() => select(period)}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${
              active
                ? "bg-[var(--ink)] text-white"
                : "text-[var(--gray-2)] hover:text-[var(--ink)]"
            }`}
          >
            {PERIOD_META[period].label}
          </button>
        );
      })}
    </div>
  );
}
