"use client";

import { FormEvent, useState } from "react";
import { CalendarRange, FileText, Percent, ReceiptText, Sparkles } from "lucide-react";
import { fetchApi, money } from "@/lib/fetch-api";

type Summary = { from: string; to: string; documentCount: number; grandTotal: string; totalTax: string; totalDiscount: string };

function monthStart() { const date = new Date(); return `${date.toISOString().slice(0, 7)}-01`; }
const today = new Date().toISOString().slice(0, 10);

export function ReportView() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await fetchApi<{ summary: Summary }>(`/api/reports/summary?from=${data.get("from")}&to=${data.get("to")}`);
      setSummary(result.summary);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to generate report."); }
    finally { setPending(false); }
  }

  const cards = summary ? [
    { label: "Documents", value: String(summary.documentCount), icon: FileText, tone: "ink" },
    { label: "Grand total", value: money(summary.grandTotal), icon: Sparkles, tone: "coral" },
    { label: "Total tax", value: money(summary.totalTax), icon: ReceiptText, tone: "blue" },
    { label: "Total discount", value: money(summary.totalDiscount), icon: Percent, tone: "gold" },
  ] : [];

  return <main className="page-shell report-page">
    <header className="page-header"><div><p className="eyebrow">Summary report</p><h1>What the period adds up to.</h1><p className="page-intro">An inclusive issue-date view across your drafts and finalized documents.</p></div></header>
    <section className="report-filter">
      <div><CalendarRange size={22} /><div><strong>Choose a date range</strong><span>Both boundary dates are included.</span></div></div>
      <form onSubmit={run}><label>From<input name="from" type="date" required defaultValue={monthStart()} /></label><span className="range-dash">—</span><label>To<input name="to" type="date" required defaultValue={today} /></label><button className="button button-primary" disabled={pending}>{pending ? "Running…" : "Run report"}</button></form>
    </section>
    {error && <div className="notice notice-error">{error}</div>}
    {!summary ? <section className="report-placeholder"><div className="report-orbit"><CalendarRange size={30} /></div><h2>Your numbers, in one view.</h2><p>Select a period to calculate document count, grand total, tax, and discounts directly from server totals.</p></section> : <>
      <div className="report-period"><span>REPORTING PERIOD</span><strong>{summary.from} → {summary.to}</strong></div>
      <section className="metric-grid">{cards.map(({ label, value, icon: Icon, tone }) => <article className={`metric-card ${tone}`} key={label}><div className="metric-icon"><Icon size={19} /></div><span>{label}</span><strong>{value}</strong></article>)}</section>
      <div className="report-note"><strong>Included in this report</strong><p>All documents owned by this account whose issue date falls within the selected range, including drafts and finalized documents.</p></div>
    </>}
  </main>;
}
