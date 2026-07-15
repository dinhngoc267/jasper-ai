/**
 * Server-rendered presentational widgets for the admin Dashboard: KPI cards
 * and charts (leads-over-time area, conversion funnel, revenue bars, lead
 * sources bars).
 *
 * All charts are plain server components — inline SVG / CSS driven by data
 * props, no client JS. Only the period toggle (`period-toggle.tsx`) needs to be
 * a client component. Styling goes entirely through the Apple-minimalist design
 * tokens in `globals.css`; the single data series uses Apple blue with a
 * hairline grid and an emphasized endpoint, per the dataviz guidance.
 */
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type {
  FunnelStage,
  Kpi,
  RevenueBar,
  SourceBar,
  TimePoint,
} from "@/lib/dashboard";

// ── Shared card shell ─────────────────────────────────────────────────────────
export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--rule)] bg-[var(--paper)] p-5 ${className}`}
    >
      {title && (
        <div className="mb-4">
          <h3 className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-[12.5px] text-[var(--gray-2)]">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ── KPI cards ─────────────────────────────────────────────────────────────────
export function KpiCard({ kpi }: { kpi: Kpi }) {
  const up = (kpi.delta ?? 0) > 0;
  const down = (kpi.delta ?? 0) < 0;
  const Arrow = down ? ArrowDownRight : ArrowUpRight;
  const chipColor = down ? "var(--red)" : up ? "var(--green)" : "var(--gray-2)";
  const chipBg = down ? "var(--red-soft)" : up ? "var(--green-soft)" : "var(--gray-soft)";

  return (
    <div className="rounded-2xl border border-[var(--rule)] bg-[var(--paper)] p-5">
      <p className="text-[12.5px] font-medium text-[var(--gray-2)]">{kpi.label}</p>
      <p className="mt-2 text-[30px] font-semibold leading-none tracking-tight text-[var(--ink)]">
        {kpi.value}
      </p>
      <span
        className="mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
        style={{ color: chipColor, background: chipBg }}
      >
        <Arrow size={12} strokeWidth={2.5} />
        {kpi.deltaText}
      </span>
    </div>
  );
}

export function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.key} kpi={kpi} />
      ))}
    </div>
  );
}

// ── Leads over time (area chart) ──────────────────────────────────────────────
export function LeadsAreaChart({ points }: { points: TimePoint[] }) {
  const W = 600;
  const H = 200;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  // Up to ~6 evenly spaced x labels so a 30-day window doesn't crowd.
  const labelCount = Math.min(n, 6);
  const labelIdx = new Set<number>();
  for (let k = 0; k < labelCount; k++) {
    labelIdx.add(Math.round((k * (n - 1)) / Math.max(1, labelCount - 1)));
  }

  const gridLines = [0, 0.5, 1];
  const last = points[n - 1];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="New leads over time">
        <defs>
          <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((g) => {
          const gy = padT + innerH - g * innerH;
          return (
            <line
              key={g}
              x1={padL}
              y1={gy}
              x2={W - padR}
              y2={gy}
              stroke="var(--rule)"
              strokeWidth={1}
            />
          );
        })}

        <path d={area} fill="url(#leadsFill)" />
        <path d={line} fill="none" stroke="var(--blue)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Emphasized endpoint */}
        {last && (
          <>
            <circle cx={x(n - 1)} cy={y(last.value)} r={5.5} fill="var(--paper)" />
            <circle cx={x(n - 1)} cy={y(last.value)} r={3.5} fill="var(--blue)" />
          </>
        )}

        {points.map((p, i) =>
          labelIdx.has(i) ? (
            <text
              key={i}
              x={x(i)}
              y={H - 6}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              fontSize={11}
              fill="var(--gray-1)"
            >
              {p.label}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

// ── Conversion funnel (horizontal bars) ───────────────────────────────────────
export function ConversionFunnel({ stages }: { stages: FunnelStage[] }) {
  const top = Math.max(1, stages[0]?.count ?? 0);

  return (
    <div className="flex flex-col gap-3">
      {stages.map((stage) => {
        const widthPct = Math.max(4, (stage.count / top) * 100);
        const conv = Math.round((stage.count / top) * 100);
        return (
          <div key={stage.key}>
            <div className="mb-1 flex items-center justify-between text-[12.5px]">
              <span className="font-medium text-[var(--ink)]">{stage.label}</span>
              <span className="text-[var(--gray-2)]">
                <span className="font-semibold text-[var(--ink)]">{stage.count}</span>
                <span className="ml-1.5 text-[11.5px]">{conv}%</span>
              </span>
            </div>
            <div className="h-[10px] w-full overflow-hidden rounded-full bg-[var(--cream)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${widthPct}%`, background: stage.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Lead sources / how they heard (horizontal bars) ──────────────────────────
export function SourceBars({ sources }: { sources: SourceBar[] }) {
  if (sources.length === 0) {
    return (
      <p className="text-[13px] text-[var(--gray-2)]">
        No source data yet — it appears once leads pick “how they heard” on the
        contact form.
      </p>
    );
  }
  const top = Math.max(1, sources[0].count);
  const total = sources.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex flex-col gap-3">
      {sources.map((s) => {
        const widthPct = Math.max(4, (s.count / top) * 100);
        const share = Math.round((s.count / total) * 100);
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-center justify-between text-[12.5px]">
              <span className="font-medium text-[var(--ink)]">{s.label}</span>
              <span className="text-[var(--gray-2)]">
                <span className="font-semibold text-[var(--ink)]">{s.count}</span>
                <span className="ml-1.5 text-[11.5px]">{share}%</span>
              </span>
            </div>
            <div className="h-[10px] w-full overflow-hidden rounded-full bg-[var(--cream)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${widthPct}%`, background: "var(--purple)" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Revenue (vertical bars) ───────────────────────────────────────────────────
function compactUsd(cents: number): string {
  const dollars = cents / 100;
  if (dollars === 0) return "$0";
  if (dollars >= 1000) return `$${Math.round(dollars / 1000)}k`;
  return `$${Math.round(dollars)}`;
}

export function RevenueBarChart({ bars }: { bars: RevenueBar[] }) {
  const W = 600;
  const H = 200;
  const padT = 22;
  const padB = 24;
  const innerH = H - padT - padB;
  const max = Math.max(1, ...bars.map((b) => b.cents));
  const n = bars.length;
  const slot = W / n;
  const barW = Math.min(48, slot * 0.5);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Revenue by period">
        <line x1={0} y1={padT + innerH} x2={W} y2={padT + innerH} stroke="var(--rule)" strokeWidth={1} />
        {bars.map((b, i) => {
          const h = (b.cents / max) * innerH;
          const cx = i * slot + slot / 2;
          const bx = cx - barW / 2;
          const by = padT + innerH - h;
          const isLast = i === n - 1;
          return (
            <g key={i}>
              {b.cents > 0 && (
                <text x={cx} y={by - 6} textAnchor="middle" fontSize={10.5} fill="var(--gray-2)">
                  {compactUsd(b.cents)}
                </text>
              )}
              <rect
                x={bx}
                y={by}
                width={barW}
                height={Math.max(0, h)}
                rx={4}
                fill={isLast ? "var(--blue)" : "var(--blue-soft)"}
              />
              <text x={cx} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--gray-1)">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
