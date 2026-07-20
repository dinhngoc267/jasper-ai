"use client";

/**
 * Presentational widgets for the admin Dashboard: KPI cards and charts
 * (leads-vs-won combo chart, conversion funnel, revenue bars, source
 * performance, content attribution).
 *
 * The four data charts (LeadsVsWonChart, ConversionFunnel, SourcePerformance,
 * RevenueBarChart) are rendered with Recharts for interactive hover tooltips,
 * smooth curves, and gridlines — the whole file is therefore a client
 * component. They render from serializable data props only; the numbers come
 * straight from `lib/dashboard.ts` (server) and are never recomputed here, so
 * this migration from the old hand-rolled inline SVG is rendering-only.
 *
 * Colors come exclusively from the Apple-minimalist design tokens in
 * `globals.css` (--blue, --green, --rule, etc.) — no chart introduces a new
 * hex value. The digest email is deliberately untouched and stays
 * table/CSS-based with zero client JS.
 */
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ContentAttributionRow,
  FunnelStage,
  Kpi,
  LeadsVsWonPoint,
  RevenueBar,
  SourceQualityRow,
} from "@/lib/dashboard";
import { formatUsd } from "@/lib/pipeline";

// ── Design-token colors (SVG-safe var() references) ───────────────────────────
const BLUE = "var(--blue)";
const GREEN = "var(--green)";
const RULE = "var(--rule)";
const GRAY_1 = "var(--gray-1)";
const GRAY_2 = "var(--gray-2)";
const INK = "var(--ink)";
const CREAM = "var(--cream)";
const PAPER = "var(--paper)";

// ── Shared card shell ─────────────────────────────────────────────────────────
/** A small pill in a card header stating the card's time scope. `fixed` cards
 * are always-time (gray); non-fixed cards echo the active period toggle (blue),
 * so it's obvious at a glance which cards the Week/Month/Quarter filter drives. */
export type CardScope = { label: string; fixed?: boolean };

export function Card({
  title,
  subtitle,
  scope,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  scope?: CardScope;
  /** Header top-right slot (e.g. a per-chart period toggle). Takes precedence
   * over `scope` — a card that owns a period control shows the control, not a
   * static scope pill. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--rule)] bg-[var(--paper)] p-5 ${className}`}
    >
      {(title || scope || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[12.5px] text-[var(--gray-2)]">{subtitle}</p>
            )}
          </div>
          {action ? (
            <div className="shrink-0">{action}</div>
          ) : (
            scope && (
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                  scope.fixed
                    ? "bg-[var(--cream)] text-[var(--gray-1)]"
                    : "bg-[var(--blue-soft)] text-[var(--blue)]"
                }`}
              >
                {scope.label}
              </span>
            )
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
    <div className="rounded-xl bg-[var(--cream)] p-4">
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

// ── Tooltip primitives (shared across every Recharts chart) ───────────────────
type TipItem = {
  name?: string;
  value?: number | string;
  dataKey?: string | number;
  color?: string;
  payload?: Record<string, unknown>;
};
type TipProps = { active?: boolean; payload?: TipItem[]; label?: string | number };

function TooltipShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
      <p className="mb-1 font-semibold text-[var(--ink)]">{title}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function TipRow({
  swatch,
  label,
  value,
}: {
  swatch?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="inline-flex items-center gap-1.5 text-[var(--gray-2)]">
        {swatch && (
          <span className="h-2 w-2 rounded-full" style={{ background: swatch }} />
        )}
        {label}
      </span>
      <span className="font-semibold text-[var(--ink)]">{value}</span>
    </div>
  );
}

// ── Leads created vs. won (area + line, two series, one shared count axis) ─────
/**
 * Deliberately a single shared count axis, not dual-axis — see the design
 * doc (`docs/superpowers/specs/2026-07-17-dashboard-modern-redesign-design.md`):
 * a dual-axis chart overlaying two different scales invites false visual
 * correlation. The explicit "Leads / deals (count)" caption names the unit
 * both series share (the old "Leads over time" chart's missing axis label was
 * flagged during design review). The x-axis bucket granularity — weeks vs
 * months vs quarters — is entirely data-driven from the period toggle upstream
 * in `lib/dashboard.ts`; this component just renders whatever points arrive.
 */
export function LeadsVsWonChart({ points }: { points: LeadsVsWonPoint[] }) {
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-medium text-[var(--gray-2)]">
        Leads / deals (count)
      </p>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={points}
            margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
          >
            <defs>
              <linearGradient id="leadsVsWonFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={0.16} />
                <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={RULE} />
            <XAxis
              dataKey="label"
              tick={{ fill: GRAY_1, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: RULE }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: GRAY_2, fontSize: 10.5 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              content={<LeadsVsWonTip />}
              cursor={{ stroke: RULE, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="leads"
              name="Leads created"
              stroke={BLUE}
              strokeWidth={2}
              fill="url(#leadsVsWonFill)"
              dot={false}
              activeDot={{ r: 4, fill: BLUE, stroke: PAPER, strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="won"
              name="Won (cumulative)"
              stroke={GREEN}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: GREEN, stroke: PAPER, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center gap-4 text-[11.5px] text-[var(--gray-2)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: BLUE }} />
          Leads created
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />
          Won (cumulative)
        </span>
      </div>
    </div>
  );
}

function LeadsVsWonTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const leads = payload.find((p) => p.dataKey === "leads")?.value ?? 0;
  const won = payload.find((p) => p.dataKey === "won")?.value ?? 0;
  return (
    <TooltipShell title={String(label ?? "")}>
      <TipRow swatch={BLUE} label="Leads created" value={String(leads)} />
      <TipRow swatch={GREEN} label="Won (cumulative)" value={String(won)} />
    </TooltipShell>
  );
}

// ── Conversion funnel (tapering funnel chart) ─────────────────────────────────
/**
 * A true tapering funnel (Recharts FunnelChart), one segment per stage sized by
 * count. Every dimension is always visible — no hover needed: the segment name
 * and count sit to the right of each band, with the stage-to-stage conversion
 * from the prior stage and median days in stage on the line below. The hover
 * tooltip repeats the same figures plus "% of all leads".
 */
type FunnelDatum = {
  name: string;
  value: number;
  fill: string;
  ofAll: number;
  conv: number | null;
  med: number | null;
};

export function ConversionFunnel({ stages }: { stages: FunnelStage[] }) {
  if (stages.length === 0 || stages.every((s) => s.count === 0)) {
    return (
      <p className="py-10 text-center text-[13px] text-[var(--gray-2)]">
        No leads created in this period.
      </p>
    );
  }
  const top = Math.max(1, stages[0]?.count ?? 0);
  const data: FunnelDatum[] = stages.map((s) => ({
    name: s.label,
    value: s.count,
    fill: s.color,
    ofAll: Math.round((s.count / top) * 100),
    conv: s.conversionFromPrev,
    med: s.medianDaysInStage,
  }));
  const height = Math.max(210, stages.length * 54);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart margin={{ top: 6, right: 148, bottom: 6, left: 4 }}>
          <Tooltip content={<FunnelTip />} />
          <Funnel
            dataKey="value"
            data={data}
            isAnimationActive
            stroke={PAPER}
            strokeWidth={2}
          >
            <LabelList content={(p) => <FunnelSideLabel {...p} data={data} />} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Two-line label anchored to the right of each funnel segment: stage name +
 * count on top, conversion-from-prior + median days beneath. */
function FunnelSideLabel(props: {
  data: FunnelDatum[];
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  index?: number;
}) {
  const { data, index = 0 } = props;
  const d = data[index];
  if (!d) return null;
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  const lx = x + width + 12;
  const cy = y + height / 2;
  const metrics =
    d.conv !== null
      ? `${d.conv}% from prior${d.med !== null ? ` · ${d.med}d med` : ""}`
      : "Entry stage";
  return (
    <g>
      <text x={lx} y={cy - 3} fontSize={12} fontWeight={600} fill={INK}>
        {d.name} · {d.value}
      </text>
      <text x={lx} y={cy + 11} fontSize={10} fill={GRAY_2}>
        {metrics}
      </text>
    </g>
  );
}

function FunnelTip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as unknown as FunnelDatum;
  return (
    <TooltipShell title={d.name}>
      <TipRow label="Reached" value={`${d.value} (${d.ofAll}% of all)`} />
      <TipRow
        label="From prior stage"
        value={d.conv !== null ? `${d.conv}%` : "Entry stage"}
      />
      <TipRow
        label="Median in stage"
        value={d.med !== null ? `${d.med}d` : "—"}
      />
    </TooltipShell>
  );
}

// ── Source performance (combo: leads bars + win-rate line) ────────────────────
/**
 * A dual-axis combo chart of the two things that describe channel quality: lead
 * count as bars (left axis) and win-rate % as a line (right axis, fixed 0–100
 * scale). The axes use plainly different units (a count vs a percentage), so
 * the overlay reads as two distinct series rather than a false correlation.
 * Revenue is deliberately NOT shown here — per-source revenue attribution is
 * ambiguous and lives in the Revenue chart / KPI instead; keeping this card to
 * leads + win rate makes "where do good leads come from" read at a glance.
 */
export function SourcePerformance({ rows }: { rows: SourceQualityRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-[var(--gray-2)]">
        No source data for this period.
      </p>
    );
  }

  return (
    <div>
      <div className="h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 12, right: 4, bottom: 0, left: -14 }}>
            <CartesianGrid vertical={false} stroke={RULE} />
            <XAxis
              dataKey="source"
              tick={{ fill: GRAY_1, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: RULE }}
              interval={0}
            />
            <YAxis
              yAxisId="leads"
              allowDecimals={false}
              tick={{ fill: GRAY_2, fontSize: 10.5 }}
              tickLine={false}
              axisLine={false}
              width={34}
            />
            <YAxis
              yAxisId="win"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: GRAY_2, fontSize: 10.5 }}
              tickLine={false}
              axisLine={false}
              width={38}
            />
            <Tooltip content={<SourceTip />} cursor={{ fill: CREAM }} />
            <Bar
              yAxisId="leads"
              dataKey="leadCount"
              name="Leads"
              fill={BLUE}
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            >
              <LabelList
                dataKey="leadCount"
                position="top"
                style={{ fill: GRAY_2, fontSize: 10.5, fontWeight: 600 }}
              />
            </Bar>
            <Line
              yAxisId="win"
              type="monotone"
              dataKey="winRate"
              name="Win rate"
              stroke={GREEN}
              strokeWidth={2}
              dot={{ r: 3, fill: GREEN, stroke: PAPER, strokeWidth: 1.5 }}
              activeDot={{ r: 4, fill: GREEN, stroke: PAPER, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[var(--gray-2)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: BLUE }} />
          Leads (left axis)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />
          Win rate % (right axis)
        </span>
      </div>
    </div>
  );
}

function SourceTip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload as unknown as SourceQualityRow;
  return (
    <TooltipShell title={r.source}>
      <TipRow swatch={BLUE} label="Leads" value={String(r.leadCount)} />
      <TipRow swatch={GREEN} label="Win rate" value={`${r.winRate}%`} />
    </TooltipShell>
  );
}

// ── Content attribution table (lead count, win rate, revenue per blog post) ──
/**
 * Same aggregation shape and table styling as the old "Source quality"
 * table, grouped by blog slug instead of source — stays a table (not bars)
 * since row count grows with every post published, and a table stays
 * legible at higher row counts where bars would get cluttered.
 */
export function ContentAttributionTable({ rows }: { rows: ContentAttributionRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-[var(--gray-2)]">
        No content-attributed leads yet.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--rule)] text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-1)]">
            <th className="py-2.5 pr-4">Post</th>
            <th className="py-2.5 pr-4 text-right">Leads</th>
            <th className="py-2.5 pr-4 text-right">Win rate</th>
            <th className="py-2.5 pr-4 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.landingPage} className="border-b border-[var(--rule)] last:border-0">
              <td className="py-2.5 pr-4 text-[13px] font-medium text-[var(--ink)]">
                {row.landingPage}
              </td>
              <td className="py-2.5 pr-4 text-right text-[13px] text-[var(--ink)]">
                {row.leadCount}
              </td>
              <td className="py-2.5 pr-4 text-right text-[13px] text-[var(--ink)]">
                {row.winRate}%
              </td>
              <td className="py-2.5 pr-4 text-right text-[13px] text-[var(--ink)]">
                {formatUsd(row.revenueCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

/** Month-over-month delta text + color, mirroring `KpiCard`'s chip logic
 * (green = up, red = down, gray = flat/no prior period). */
function momDelta(curCents: number, prevCents: number | null): { text: string; color: string } {
  if (prevCents === null || prevCents === 0) {
    return { text: "—", color: "var(--gray-2)" };
  }
  const pct = Math.round(((curCents - prevCents) / prevCents) * 100);
  const color = pct > 0 ? "var(--green)" : pct < 0 ? "var(--red)" : "var(--gray-2)";
  const text = pct === 0 ? "flat" : `${pct > 0 ? "+" : ""}${pct}%`;
  return { text, color };
}

/** Above-bar label: the compact revenue value plus the colored MoM delta chip,
 * preserving the delta information from the pre-Recharts hand-rolled chart. */
function RevenueBarLabel(props: {
  bars: RevenueBar[];
  x?: number | string;
  y?: number | string;
  width?: number | string;
  index?: number;
}) {
  const { bars, index = 0 } = props;
  const b = bars[index];
  if (!b) return null;
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const cx = x + width / 2;
  const { text, color } = momDelta(b.cents, index === 0 ? null : bars[index - 1].cents);
  return (
    <g>
      {b.cents > 0 && (
        <text x={cx} y={y - 17} textAnchor="middle" fontSize={11} fontWeight={600} fill={INK}>
          {compactUsd(b.cents)}
        </text>
      )}
      <text x={cx} y={y - 5} textAnchor="middle" fontSize={10} fontWeight={600} fill={color}>
        {text}
      </text>
    </g>
  );
}

export function RevenueBarChart({ bars }: { bars: RevenueBar[] }) {
  const n = bars.length;
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={bars}
          margin={{ top: 30, right: 8, bottom: 0, left: -6 }}
          barCategoryGap="24%"
        >
          <defs>
            {/* Power BI-style vertical fade — same --blue token, opacity only */}
            <linearGradient id="revGradLast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity={0.72} />
              <stop offset="100%" stopColor={BLUE} stopOpacity={1} />
            </linearGradient>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity={0.34} />
              <stop offset="100%" stopColor={BLUE} stopOpacity={0.62} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={RULE} />
          <XAxis
            dataKey="label"
            tick={{ fill: GRAY_1, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: RULE }}
            tickMargin={8}
          />
          <YAxis
            width={48}
            tickFormatter={(v) => compactUsd(Number(v))}
            tick={{ fill: GRAY_2, fontSize: 10.5 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<RevenueTip bars={bars} />} cursor={{ fill: "transparent" }} />
          <Bar
            dataKey="cents"
            radius={[6, 6, 0, 0]}
            maxBarSize={54}
            background={{ fill: CREAM, radius: 6 }}
            activeBar={{ stroke: BLUE, strokeOpacity: 0.35, strokeWidth: 1 }}
          >
            {bars.map((b, i) => (
              <Cell
                key={b.label}
                fill={i === n - 1 ? "url(#revGradLast)" : "url(#revGrad)"}
              />
            ))}
            <LabelList content={(p) => <RevenueBarLabel {...p} bars={bars} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RevenueTip({
  active,
  payload,
  label,
  bars,
}: TipProps & { bars: RevenueBar[] }) {
  if (!active || !payload?.length) return null;
  const cents = Number(payload[0].value ?? 0);
  const idx = bars.findIndex((b) => b.label === label);
  const { text } = momDelta(cents, idx <= 0 ? null : bars[idx - 1].cents);
  return (
    <TooltipShell title={String(label ?? "")}>
      <TipRow swatch={BLUE} label="Revenue" value={formatUsd(cents)} />
      <TipRow label="vs prior period" value={text} />
    </TooltipShell>
  );
}
