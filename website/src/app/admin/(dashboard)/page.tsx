import { fetchDashboardData, parsePeriod } from "@/lib/dashboard";
import { PeriodToggle } from "./period-toggle";
import {
  Card,
  ContentAttributionTable,
  ConversionFunnel,
  KpiRow,
  LeadsVsWonChart,
  RevenueBarChart,
  SourcePerformance,
} from "./dashboard-widgets";
import { NeedsAttentionTable } from "./needs-attention-table";

// Render on every request — never at build time (there is no database during
// `next build`). Same pattern as every other admin page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard — Jasper AI Admin",
};

/**
 * A plain uppercase label above a section's card(s) — explains WHY things
 * are grouped together (a number badge doesn't). See the design doc for the
 * full reasoning behind the section order (act → diagnose → understand
 * channels → historical context).
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11.5px] font-bold uppercase tracking-wide text-[var(--gray-1)]">
      {children}
    </h2>
  );
}

/**
 * Each time-series widget (key metrics, leads-vs-won, revenue) owns its own
 * Week/Month/Quarter toggle, written to a distinct search param, so their
 * periods are independent. The snapshot widgets (funnel, source performance,
 * content attribution) have no period — a funnel/attribution view is "current
 * state", not "what happened this week" — and carry a fixed "All time" pill.
 */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    kpi?: string | string[];
    leads?: string | string[];
    revenue?: string | string[];
    source?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const kpiPeriod = parsePeriod(sp.kpi);
  const leadsPeriod = parsePeriod(sp.leads);
  const revenuePeriod = parsePeriod(sp.revenue);
  const sourcePeriod = parsePeriod(sp.source);

  const data = await fetchDashboardData({
    kpi: kpiPeriod,
    leads: leadsPeriod,
    revenue: revenuePeriod,
    source: sourcePeriod,
  });

  const allTimeScope = { label: "All time", fixed: true } as const;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-[var(--gray-2)]">
          Pipeline, revenue, and what needs a nudge — at a glance.
        </p>
      </header>

      {/* Key metrics — a titled card (toggle in its header, like every other
          period-controlled chart) wrapping the KPI tiles. */}
      <Card
        title="Key metrics"
        action={<PeriodToggle current={kpiPeriod} param="kpi" size="sm" />}
      >
        <KpiRow kpis={data.kpis} />
      </Card>

      {/* Pipeline health */}
      <div className="mt-8">
        <SectionLabel>Pipeline health</SectionLabel>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card
            title="Leads created vs. won"
            subtitle={
              leadsPeriod === "week"
                ? "Weekly · last 10 weeks · won is cumulative"
                : leadsPeriod === "month"
                  ? "Monthly · last 6 months · won is cumulative"
                  : "Quarterly · last 6 quarters · won is cumulative"
            }
            action={<PeriodToggle current={leadsPeriod} param="leads" size="sm" />}
            className="lg:col-span-2"
          >
            <LeadsVsWonChart points={data.leadsVsWon} />
          </Card>
          <Card
            title="Conversion funnel"
            subtitle="Furthest stage reached"
            scope={allTimeScope}
          >
            <ConversionFunnel stages={data.funnel} />
          </Card>
        </div>
      </div>

      {/* Channel performance — both all-time (no natural period dimension). */}
      <div className="mt-8">
        <SectionLabel>Channel performance</SectionLabel>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            title="Source performance"
            subtitle="Leads created this period · self-reported + captured true source"
            action={<PeriodToggle current={sourcePeriod} param="source" size="sm" />}
          >
            <SourcePerformance rows={data.sourceQuality} />
          </Card>
          <Card
            title="Content attribution"
            subtitle="Leads, win rate, revenue by blog post"
            scope={allTimeScope}
          >
            <ContentAttributionTable rows={data.contentAttribution} />
          </Card>
        </div>
      </div>

      {/* Revenue history — own period toggle; a weekly/monthly review tool, not
          something requiring daily action (the headline Revenue figure is
          already in the key metrics up top for the daily check). */}
      <div className="mt-8">
        <SectionLabel>Revenue history</SectionLabel>
        <div className="mt-3">
          <Card
            title="Revenue"
            subtitle={
              revenuePeriod === "week"
                ? "Paid orders · last 7 days"
                : "Paid orders · last 6 months"
            }
            action={<PeriodToggle current={revenuePeriod} param="revenue" size="sm" />}
          >
            <RevenueBarChart bars={data.revenue} />
          </Card>
        </div>
      </div>

      {/* Needs attention — the full table (search/sort/pagination), so it fits
          best as the page's last, largest "list" section. */}
      <div className="mt-8">
        <SectionLabel>Needs attention</SectionLabel>
        <div className="mt-3">
          <NeedsAttentionTable
            rows={data.needsAttention}
            leads={data.needsAttentionLeads}
            activity={data.needsAttentionActivity}
          />
        </div>
      </div>
    </div>
  );
}
