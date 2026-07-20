"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { PERIODS, PERIOD_META, type Period } from "@/lib/period";

/**
 * Week / Month / Quarter segmented control. Each time-series chart owns its own
 * instance, writing to a distinct search param (e.g. `?revenue=quarter`) so the
 * dashboard stays server-rendered and shareable and each chart's period is
 * independent. Kept client-side only for the click handler — no data lives
 * here. `scroll: false` keeps the page from jumping when a mid-page chart's
 * toggle re-renders.
 */
export function PeriodToggle({
  current,
  param = "period",
  size = "md",
}: {
  current: Period;
  param?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function select(period: Period) {
    if (period === current) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(param, period);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  const btn =
    size === "sm" ? "rounded-md px-2.5 py-1 text-[12px]" : "rounded-lg px-3.5 py-1.5 text-[13px]";

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
            className={`${btn} font-medium transition ${
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
