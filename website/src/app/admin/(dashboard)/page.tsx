import { fetchDashboardData, parsePeriod, PERIOD_META } from "@/lib/dashboard";
import { PeriodToggle } from "./period-toggle";
import {
  Card,
  ConversionFunnel,
  KpiRow,
  LeadsAreaChart,
  RevenueBarChart,
  SourceBars,
} from "./dashboard-widgets";
import { NeedsAttentionTable } from "./needs-attention-table";

// Render on every request — never at build time (there is no database during
// `next build`). Same pattern as every other admin page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard — Jasper AI Admin",
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const period = parsePeriod((await searchParams).period);
  const data = await fetchDashboardData(period);
  const { compare } = PERIOD_META[period];

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-[var(--gray-2)]">
            Pipeline, revenue, and what needs a nudge — at a glance.
          </p>
        </div>
        <PeriodToggle current={period} />
      </header>

      <KpiRow kpis={data.kpis} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Leads over time"
          subtitle={`New inquiries · ${compare.replace("vs ", "").replace("last ", "this ")}`}
          className="lg:col-span-2"
        >
          <LeadsAreaChart points={data.leadsOverTime} />
        </Card>
        <Card
          title="Conversion funnel"
          subtitle="Furthest stage reached · all time"
        >
          <ConversionFunnel stages={data.funnel} />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Revenue"
          subtitle={period === "week" ? "Paid orders · last 7 days" : "Paid orders · last 6 months"}
          className="lg:col-span-2"
        >
          <RevenueBarChart bars={data.revenue} />
        </Card>
        <Card title="How they heard" subtitle="Lead sources · all time">
          <SourceBars sources={data.sources} />
        </Card>
      </div>

      <div className="mt-4">
        <NeedsAttentionTable rows={data.needsAttention} />
      </div>
    </div>
  );
}
