/**
 * Internal morning-pulse digest — 100% internal, sent only to
 * jasper.le@edge8.ai (BUILD 3, part 4). Built with React Email, whose
 * components (`Section`/`Row`/`Column`) render as plain HTML tables under
 * the hood — no flexbox/grid, no remote images — so this reads correctly in
 * every client, including with remote images blocked entirely. Colors are
 * literal hex (email clients don't resolve CSS custom properties), matching
 * `docs/brand/style-guide.md`'s Apple-minimalist palette from `globals.css`.
 */
import {
  Body,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Text,
} from "@react-email/components";
import type { DigestData } from "@/lib/digest";
import type { StaleLeadForDigest } from "@/lib/pipeline";

const COLORS = {
  ink: "#1d1d1f",
  gray2: "#6e6e73",
  gray1: "#86868b",
  rule: "#ececec",
  blue: "#0071e3",
  green: "#34c759",
  greenSoft: "#e8f9ec",
  amber: "#ff9500",
  amberSoft: "#fff4e5",
  red: "#ff3b30",
  redSoft: "#ffeceb",
  cream: "#f5f5f7",
  paper: "#ffffff",
};

function StatCell({
  label,
  value,
  deltaText,
  positive,
}: {
  label: string;
  value: string;
  deltaText: string;
  positive: boolean;
}) {
  return (
    <Column
      style={{
        padding: "16px",
        background: COLORS.cream,
        borderRadius: 12,
        width: "33.33%",
      }}
      align="left"
    >
      <Text style={{ margin: 0, fontSize: 12, color: COLORS.gray2, fontWeight: 600 }}>
        {label}
      </Text>
      <Text style={{ margin: "4px 0 0", fontSize: 26, color: COLORS.ink, fontWeight: 700 }}>
        {value}
      </Text>
      <Text
        style={{
          margin: "4px 0 0",
          fontSize: 12,
          fontWeight: 600,
          color: positive ? COLORS.green : COLORS.red,
        }}
      >
        {deltaText}
      </Text>
    </Column>
  );
}

function FunnelRow({
  label,
  count,
  color,
  conversionText,
}: {
  label: string;
  count: number;
  color: string;
  conversionText: string;
}) {
  return (
    <Row style={{ marginBottom: 8 }}>
      <Column style={{ width: 10 }}>
        <table role="presentation" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                  background: color,
                }}
              />
            </tr>
          </tbody>
        </table>
      </Column>
      <Column>
        <Text style={{ margin: 0, fontSize: 13, color: COLORS.ink, fontWeight: 500 }}>
          {label}
        </Text>
      </Column>
      <Column align="right">
        <Text style={{ margin: 0, fontSize: 13, color: COLORS.ink, fontWeight: 700 }}>
          {count}
        </Text>
      </Column>
      <Column align="right" style={{ width: 140 }}>
        <Text style={{ margin: 0, fontSize: 11.5, color: COLORS.gray1 }}>{conversionText}</Text>
      </Column>
    </Row>
  );
}

function StaleLeadRow({ lead, siteUrl }: { lead: StaleLeadForDigest; siteUrl: string }) {
  const badgeColor = lead.urgency === "critical" ? COLORS.red : COLORS.amber;
  const badgeBg = lead.urgency === "critical" ? COLORS.redSoft : COLORS.amberSoft;
  return (
    <Row style={{ marginBottom: 10 }}>
      <Column>
        <Link
          href={`${siteUrl}/admin/leads?lead=${lead.id}`}
          style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink, textDecoration: "none" }}
        >
          {lead.name}
        </Link>
        <Text style={{ margin: "2px 0 0", fontSize: 11.5, color: COLORS.gray1 }}>
          {lead.statusLabel}
        </Text>
      </Column>
      <Column align="right" style={{ width: 90 }}>
        <table role="presentation" cellPadding={0} cellSpacing={0} style={{ marginLeft: "auto" }}>
          <tbody>
            <tr>
              <td
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: badgeColor,
                  background: badgeBg,
                  borderRadius: 999,
                  padding: "3px 9px",
                }}
              >
                {lead.idleDays}d idle
              </td>
            </tr>
          </tbody>
        </table>
      </Column>
    </Row>
  );
}

export function DigestEmail({ data, siteUrl }: { data: DigestData; siteUrl: string }) {
  return (
    <Html>
      <Head />
      <Preview>
        {data.totalStale > 0
          ? `${data.totalStale} lead${data.totalStale === 1 ? "" : "s"} need a nudge today`
          : "Morning pulse — pipeline is clean"}
      </Preview>
      <Body style={{ backgroundColor: COLORS.cream, fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container
          style={{
            backgroundColor: COLORS.paper,
            margin: "0 auto",
            padding: "32px 28px",
            maxWidth: 560,
            borderRadius: 16,
          }}
        >
          <Heading style={{ fontSize: 20, color: COLORS.ink, margin: 0 }}>
            Jasper AI — Morning Pulse
          </Heading>
          <Text style={{ margin: "4px 0 24px", fontSize: 13, color: COLORS.gray2 }}>
            {data.dateLabel}
          </Text>

          <Row>
            {data.kpis.map((kpi) => (
              <StatCell
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                deltaText={kpi.deltaText}
                positive={kpi.positive}
              />
            ))}
          </Row>

          <Hr style={{ borderColor: COLORS.rule, margin: "28px 0" }} />

          <Heading as="h2" style={{ fontSize: 14, color: COLORS.ink, margin: "0 0 12px" }}>
            Funnel
          </Heading>
          {data.funnel.map((stage) => (
            <FunnelRow
              key={stage.label}
              label={stage.label}
              count={stage.count}
              color={stage.color}
              conversionText={stage.conversionText}
            />
          ))}

          <Hr style={{ borderColor: COLORS.rule, margin: "28px 0" }} />

          <Heading as="h2" style={{ fontSize: 14, color: COLORS.ink, margin: "0 0 4px" }}>
            Needs attention {data.totalStale > 0 ? `(${data.totalStale})` : ""}
          </Heading>

          {data.totalStale === 0 ? (
            <Text style={{ fontSize: 13, color: COLORS.gray2 }}>
              Nothing stale — every open lead is within its stage&apos;s threshold.
            </Text>
          ) : (
            <>
              {data.critical.length > 0 && (
                <>
                  <Text
                    style={{
                      margin: "12px 0 6px",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                      color: COLORS.red,
                    }}
                  >
                    Critical
                  </Text>
                  {data.critical.map((lead) => (
                    <StaleLeadRow key={lead.id} lead={lead} siteUrl={siteUrl} />
                  ))}
                </>
              )}
              {data.warning.length > 0 && (
                <>
                  <Text
                    style={{
                      margin: "12px 0 6px",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                      color: COLORS.amber,
                    }}
                  >
                    Worth a nudge
                  </Text>
                  {data.warning.map((lead) => (
                    <StaleLeadRow key={lead.id} lead={lead} siteUrl={siteUrl} />
                  ))}
                </>
              )}
            </>
          )}

          <Hr style={{ borderColor: COLORS.rule, margin: "28px 0" }} />

          <Text style={{ fontSize: 11, color: COLORS.gray1, margin: 0 }}>
            Internal digest for jasper.le@edge8.ai · open the{" "}
            <Link href={`${siteUrl}/admin`} style={{ color: COLORS.blue }}>
              dashboard
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default DigestEmail;
