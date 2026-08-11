"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, FilePlus2, Plus, X } from "lucide-react";
import { ApiError, fetchApi, money } from "@/lib/fetch-api";
import type { PricingDocument } from "@/lib/types";

const today = new Date().toISOString().slice(0, 10);

export function DocumentList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<PricingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetchApi<{ documents: PricingDocument[] }>("/api/documents")
      .then((data) => setDocuments(data.documents))
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const showCreate = createOpen || searchParams.get("create") === "1";

  function closeCreate() {
    setCreateOpen(false);
    router.replace("/documents");
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetchApi<{ document: PricingDocument }>("/api/documents", {
        method: "POST",
        body: JSON.stringify({ title: data.get("title"), customer: data.get("customer"), issueDate: data.get("issueDate") }),
      });
      router.push(`/documents/${response.document.id}`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Unable to create document.");
      setPending(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div><p className="eyebrow">Workspace</p><h1>Documents</h1><p className="page-intro">Pricing documents with totals you can trace line by line.</p></div>
        <button className="button button-primary" onClick={() => setCreateOpen(true)}><Plus size={17} />New document</button>
      </header>

      <section className="document-section">
        <div className="section-heading"><h2>All documents</h2><span>{documents.length} total</span></div>
        {error && !showCreate && <div className="notice notice-error">{error}</div>}
        {loading ? (
          <div className="loading-grid"><span /><span /><span /></div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FilePlus2 size={25} /></div>
            <h3>Your first total starts here.</h3>
            <p>Create a document, add line items, and Ledgerly will keep the math honest.</p>
            <button className="button button-primary" onClick={() => setCreateOpen(true)}><Plus size={17} />Create document</button>
          </div>
        ) : (
          <div className="document-grid">
            {documents.map((document) => (
              <Link className="document-card" href={`/documents/${document.id}`} key={document.id}>
                <div className="card-top"><span className={`status ${document.status}`}>{document.status}</span><ArrowUpRight size={18} /></div>
                <h3>{document.title}</h3><p>{document.customer}</p>
                <div className="card-bottom"><span><CalendarDays size={15} />{document.issueDate}</span><strong>{money(document.grandTotal)}</strong></div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && closeCreate()}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
            <button className="icon-button modal-close" onClick={closeCreate} aria-label="Close"><X size={19} /></button>
            <p className="eyebrow">New draft</p><h2 id="create-title">Set the document details</h2>
            <p className="muted">You can change these until the document is finalized.</p>
            <form className="stack-form" onSubmit={create}>
              <label>Title<input name="title" required maxLength={160} autoFocus placeholder="August service proposal" /></label>
              <label>Customer<input name="customer" required maxLength={160} placeholder="Northstar & Co." /></label>
              <label>Issue date<input name="issueDate" type="date" required defaultValue={today} /></label>
              {error && <div className="form-error" role="alert">{error}</div>}
              <div className="modal-actions"><button type="button" className="button button-quiet" onClick={closeCreate}>Cancel</button><button className="button button-primary" disabled={pending}>{pending ? "Creating…" : "Create draft"}</button></div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
