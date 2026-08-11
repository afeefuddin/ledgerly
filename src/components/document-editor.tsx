"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Copy, Lock, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import { ApiError, fetchApi, money } from "@/lib/fetch-api";
import type { DiscountType, LineItem, PricingDocument } from "@/lib/types";

type LineDraft = {
  description: string;
  quantity: string;
  unitPrice: string;
  discountType: DiscountType;
  discountValue: string;
  taxPercent: string;
};

const emptyLine: LineDraft = { description: "", quantity: "1", unitPrice: "0.00", discountType: null, discountValue: "", taxPercent: "" };

export function DocumentEditor({ documentId, duplicated = false }: { documentId: string; duplicated?: boolean }) {
  const router = useRouter();
  const [document, setDocument] = useState<PricingDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [lineModal, setLineModal] = useState<{ line: LineItem | null; values: LineDraft } | null>(null);
  const [showDuplicateToast, setShowDuplicateToast] = useState(duplicated);

  const load = useCallback(() => {
    fetchApi<{ document: PricingDocument }>(`/api/documents/${documentId}`)
      .then(({ document }) => setDocument(document))
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [documentId]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!duplicated) return;
    router.replace(`/documents/${documentId}`, { scroll: false });
    const dismissTimer = window.setTimeout(() => setShowDuplicateToast(false), 5000);
    return () => window.clearTimeout(dismissTimer);
  }, [documentId, duplicated, router]);

  async function saveMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await fetchApi<{ document: PricingDocument }>(`/api/documents/${documentId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: data.get("title"), customer: data.get("customer"), issueDate: data.get("issueDate") }),
      });
      setDocument(result.document); setEditingMeta(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save."); }
    finally { setPending(false); }
  }

  async function saveLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lineModal) return;
    setPending(true); setError("");
    const body = {
      description: lineModal.values.description,
      quantity: lineModal.values.quantity,
      unitPrice: lineModal.values.unitPrice,
      discountType: lineModal.values.discountType,
      discountValue: lineModal.values.discountType ? lineModal.values.discountValue : null,
      taxPercent: lineModal.values.taxPercent || null,
    };
    try {
      const url = lineModal.line
        ? `/api/documents/${documentId}/line-items/${lineModal.line.id}`
        : `/api/documents/${documentId}/line-items`;
      const result = await fetchApi<{ document: PricingDocument }>(url, {
        method: lineModal.line ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setDocument(result.document); setLineModal(null);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Unable to save line item."); }
    finally { setPending(false); }
  }

  async function removeLine(line: LineItem) {
    if (!confirm(`Remove “${line.description}”?`)) return;
    setPending(true); setError("");
    try {
      const result = await fetchApi<{ document: PricingDocument }>(`/api/documents/${documentId}/line-items/${line.id}`, { method: "DELETE" });
      setDocument(result.document);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to remove line."); }
    finally { setPending(false); }
  }

  async function finalize() {
    if (!confirm("Finalize this document? It will become permanently read-only.")) return;
    setPending(true); setError("");
    try {
      const result = await fetchApi<{ document: PricingDocument }>(`/api/documents/${documentId}/finalize`, { method: "POST" });
      setDocument(result.document);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to finalize."); }
    finally { setPending(false); }
  }

  async function duplicate() {
    setPending(true); setError("");
    try {
      const result = await fetchApi<{ document: PricingDocument }>(`/api/documents/${documentId}/duplicate`, { method: "POST" });
      router.push(`/documents/${result.document.id}?duplicated=1`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to duplicate."); setPending(false); }
  }

  async function removeDocument() {
    if (!document || !confirm(`Delete “${document.title}”? This cannot be undone.`)) return;
    setPending(true);
    try {
      await fetchApi(`/api/documents/${documentId}`, { method: "DELETE" });
      router.push("/documents");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete."); setPending(false); }
  }

  function editLine(line: LineItem) {
    setError("");
    setLineModal({ line, values: {
      description: line.description, quantity: line.quantity, unitPrice: line.unitPrice,
      discountType: line.discountType, discountValue: line.discountValue ?? "", taxPercent: line.taxPercent ?? "",
    } });
  }

  if (loading) return <main className="page-shell"><div className="editor-loading"><span /><span /><span /></div></main>;
  if (!document) return <main className="page-shell"><div className="notice notice-error">{error || "Document not found."}</div><Link href="/documents">Back to documents</Link></main>;
  const isDraft = document.status === "draft";
  const lines = document.lines ?? [];

  return (
    <main className="page-shell document-page">
      {showDuplicateToast && (
        <div className="success-toast no-print" role="status" aria-live="polite">
          <div className="toast-icon"><CheckCircle2 size={20} /></div>
          <div><strong>Document duplicated</strong><span>A new editable draft is ready.</span></div>
          <button onClick={() => setShowDuplicateToast(false)} aria-label="Dismiss notification"><X size={18} /></button>
        </div>
      )}
      <div className="document-toolbar no-print">
        <Link href="/documents" className="back-link"><ArrowLeft size={17} />Documents</Link>
        <div className="toolbar-actions">
          {isDraft ? <>
            <button className="button button-danger-quiet" onClick={removeDocument} disabled={pending}><Trash2 size={16} />Delete</button>
            <button className="button button-dark" onClick={finalize} disabled={pending}><Lock size={16} />Finalize</button>
          </> : <>
            <button className="button button-quiet" onClick={() => window.print()}><Printer size={16} />Print</button>
            <button className="button button-primary" onClick={duplicate} disabled={pending}><Copy size={16} />Duplicate as draft</button>
          </>}
        </div>
      </div>

      {error && <div className="notice notice-error no-print">{error}</div>}
      <article className="document-paper">
        {!isDraft && <div className="final-ribbon"><Check size={14} />Finalized</div>}
        {isDraft && <div className="draft-watermark print-only">DRAFT</div>}
        <header className="paper-header">
          <div className="paper-brand"><span>L</span><div><strong>LEDGERLY</strong><small>PRICING DOCUMENT</small></div></div>
          <div className="paper-status"><span>STATUS</span><strong>{document.status.toUpperCase()}</strong></div>
        </header>

        {editingMeta ? (
          <form className="metadata-form no-print" onSubmit={saveMetadata}>
            <label>Title<input name="title" required defaultValue={document.title} /></label>
            <label>Customer<input name="customer" required defaultValue={document.customer} /></label>
            <label>Issue date<input name="issueDate" type="date" required defaultValue={document.issueDate} /></label>
            <div className="metadata-actions"><button type="button" className="button button-quiet" onClick={() => setEditingMeta(false)}>Cancel</button><button className="button button-primary" disabled={pending}>Save details</button></div>
          </form>
        ) : (
          <section className="document-heading">
            <div><p className="paper-label">Prepared for</p><h1>{document.customer}</h1><p>{document.title}</p></div>
            <div className="document-meta"><div><span>ISSUE DATE</span><strong>{document.issueDate}</strong></div>{isDraft && <button className="text-button no-print" onClick={() => setEditingMeta(true)}><Pencil size={14} />Edit details</button>}</div>
          </section>
        )}

        <section className="line-table-wrap">
          <div className="line-table-header"><h2>Line items</h2>{isDraft && <button className="button button-small no-print" onClick={() => { setError(""); setLineModal({ line: null, values: { ...emptyLine } }); }}><Plus size={15} />Add line</button>}</div>
          {lines.length === 0 ? (
            <div className="line-empty"><p>No line items yet.</p>{isDraft && <button className="text-button no-print" onClick={() => setLineModal({ line: null, values: { ...emptyLine } })}>Add the first line</button>}</div>
          ) : (
            <div className="table-scroll"><table className="line-table"><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Discount</th><th>Tax</th><th>Total</th>{isDraft && <th className="no-print"><span className="sr-only">Actions</span></th>}</tr></thead>
              <tbody>{lines.map((line) => <tr key={line.id}>
                <td><strong>{line.description}</strong><small>Subtotal {money(line.subtotal)}</small></td>
                <td>{Number(line.quantity)}</td><td>{money(line.unitPrice)}</td>
                <td>{line.discountType ? `${line.discountType === "percent" ? `${Number(line.discountValue)}%` : money(line.discountValue ?? "0")}` : "—"}<small>{line.discountAmount !== "0.00" ? `− ${money(line.discountAmount)}` : ""}</small></td>
                <td>{line.taxPercent ? `${Number(line.taxPercent)}%` : "—"}<small>{line.taxAmount !== "0.00" ? `+ ${money(line.taxAmount)}` : ""}</small></td>
                <td><strong>{money(line.lineTotal)}</strong></td>
                {isDraft && <td className="line-actions no-print"><button onClick={() => editLine(line)} aria-label={`Edit ${line.description}`}><Pencil size={15} /></button><button onClick={() => removeLine(line)} aria-label={`Remove ${line.description}`}><Trash2 size={15} /></button></td>}
              </tr>)}</tbody>
            </table></div>
          )}
        </section>

        <footer className="paper-footer">
          <div className="calculation-note"><strong>How this is calculated</strong><p>Discounts are applied before tax. Each line is rounded half-up to two decimals, then summed.</p></div>
          <div className="totals"><div><span>Subtotal</span><strong>{money(document.subtotal)}</strong></div><div><span>Discount</span><strong>− {money(document.totalDiscount)}</strong></div><div><span>Tax</span><strong>+ {money(document.totalTax)}</strong></div><div className="grand-total"><span>Grand total</span><strong>{money(document.grandTotal)}</strong></div></div>
        </footer>
      </article>

      {lineModal && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setLineModal(null)}><div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="line-title">
        <button className="icon-button modal-close" onClick={() => setLineModal(null)} aria-label="Close"><X size={19} /></button>
        <p className="eyebrow">{lineModal.line ? "Edit line" : "New line"}</p><h2 id="line-title">{lineModal.line ? lineModal.line.description : "Add a line item"}</h2>
        <form className="line-form" onSubmit={saveLine}>
          <label className="field-wide">Description<input required autoFocus value={lineModal.values.description} onChange={(e) => setLineModal({ ...lineModal, values: { ...lineModal.values, description: e.target.value } })} placeholder="Item or service" /></label>
          <label>Quantity<input required inputMode="decimal" value={lineModal.values.quantity} onChange={(e) => setLineModal({ ...lineModal, values: { ...lineModal.values, quantity: e.target.value } })} /></label>
          <label>Unit price<input required inputMode="decimal" value={lineModal.values.unitPrice} onChange={(e) => setLineModal({ ...lineModal, values: { ...lineModal.values, unitPrice: e.target.value } })} /></label>
          <label>Discount type<select value={lineModal.values.discountType ?? "none"} onChange={(e) => setLineModal({ ...lineModal, values: { ...lineModal.values, discountType: e.target.value === "none" ? null : e.target.value as "fixed" | "percent", discountValue: e.target.value === "none" ? "" : lineModal.values.discountValue } })}><option value="none">No discount</option><option value="percent">Percent</option><option value="fixed">Fixed amount</option></select></label>
          <label>Discount value<input inputMode="decimal" disabled={!lineModal.values.discountType} required={Boolean(lineModal.values.discountType)} value={lineModal.values.discountValue} onChange={(e) => setLineModal({ ...lineModal, values: { ...lineModal.values, discountValue: e.target.value } })} placeholder={lineModal.values.discountType === "percent" ? "10" : "20.00"} /></label>
          <label>Tax percent<input inputMode="decimal" value={lineModal.values.taxPercent} onChange={(e) => setLineModal({ ...lineModal, values: { ...lineModal.values, taxPercent: e.target.value } })} placeholder="Optional" /></label>
          {error && <div className="form-error field-wide" role="alert">{error}</div>}
          <div className="modal-actions field-wide"><button type="button" className="button button-quiet" onClick={() => setLineModal(null)}>Cancel</button><button className="button button-primary" disabled={pending}>{pending ? "Saving…" : lineModal.line ? "Save changes" : "Add line"}</button></div>
        </form>
      </div></div>}
    </main>
  );
}
