import "server-only";

import Decimal from "decimal.js";
import { and, asc, desc, eq, gte, lte, max } from "drizzle-orm";
import { db } from "@/db";
import { documents, lineItems, type DocumentRow, type LineItemRow } from "@/db/schema";
import { calculateDocument, calculateLine } from "./calculations";
import { DomainError, finalizedError, notFoundError } from "./errors";
import type { DocumentCreateInput, LineInput } from "./validation";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function lineCalculationInput(line: Pick<LineItemRow, "quantity" | "unitPrice" | "discountType" | "discountValue" | "taxPercent">) {
  return {
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discount:
      line.discountType && line.discountValue
        ? { type: line.discountType, value: line.discountValue }
        : null,
    taxPercent: line.taxPercent,
  } as const;
}

function presentLine(line: LineItemRow) {
  return {
    ...line,
    discountedAmount: new Decimal(line.subtotal).minus(line.discountAmount).toFixed(2),
  };
}

async function ownedDocumentForUpdate(tx: Transaction, userId: string, documentId: string) {
  const [document] = await tx
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .for("update");
  if (!document) throw notFoundError();
  return document;
}

async function recalculateDocument(tx: Transaction, documentId: string) {
  const rows = await tx.select().from(lineItems).where(eq(lineItems.documentId, documentId)).orderBy(asc(lineItems.position));
  const calculatedRows: LineItemRow[] = [];

  for (const row of rows) {
    const calculated = calculateLine(lineCalculationInput(row));
    const [updated] = await tx
      .update(lineItems)
      .set({
        subtotal: calculated.subtotal,
        discountAmount: calculated.discountAmount,
        taxAmount: calculated.taxAmount,
        lineTotal: calculated.lineTotal,
        updatedAt: new Date(),
      })
      .where(eq(lineItems.id, row.id))
      .returning();
    calculatedRows.push(updated);
  }

  const totals = calculateDocument(calculatedRows.map((line) => calculateLine(lineCalculationInput(line))));
  const [document] = await tx
    .update(documents)
    .set({ ...totals, updatedAt: new Date() })
    .where(eq(documents.id, documentId))
    .returning();
  return { ...document, lines: calculatedRows.map(presentLine) };
}

export async function listDocuments(userId: string) {
  return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.issueDate), desc(documents.createdAt));
}

export async function getDocument(userId: string, documentId: string) {
  const [document] = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
  if (!document) throw notFoundError();
  const lines = await db.select().from(lineItems).where(eq(lineItems.documentId, documentId)).orderBy(asc(lineItems.position));
  return { ...document, lines: lines.map(presentLine) };
}

export async function createDocument(userId: string, input: DocumentCreateInput) {
  const [document] = await db.insert(documents).values({ ...input, userId }).returning();
  return { ...document, lines: [] };
}

export async function updateDocument(userId: string, documentId: string, input: Partial<DocumentCreateInput>) {
  return db.transaction(async (tx) => {
    const document = await ownedDocumentForUpdate(tx, userId, documentId);
    if (document.status === "finalized") throw finalizedError();
    await tx.update(documents).set({ ...input, updatedAt: new Date() }).where(eq(documents.id, documentId));
    return recalculateDocument(tx, documentId);
  });
}

export async function deleteDocument(userId: string, documentId: string) {
  return db.transaction(async (tx) => {
    const document = await ownedDocumentForUpdate(tx, userId, documentId);
    if (document.status === "finalized") throw finalizedError();
    await tx.delete(documents).where(eq(documents.id, documentId));
  });
}

function lineValues(input: LineInput) {
  const calculated = calculateLine({
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    discount: input.discountType && input.discountValue ? { type: input.discountType, value: input.discountValue } : null,
    taxPercent: input.taxPercent,
  });
  return {
    ...input,
    subtotal: calculated.subtotal,
    discountAmount: calculated.discountAmount,
    taxAmount: calculated.taxAmount,
    lineTotal: calculated.lineTotal,
  };
}

export async function createLineItem(userId: string, documentId: string, input: LineInput) {
  return db.transaction(async (tx) => {
    const document = await ownedDocumentForUpdate(tx, userId, documentId);
    if (document.status === "finalized") throw finalizedError();
    const [positionResult] = await tx.select({ value: max(lineItems.position) }).from(lineItems).where(eq(lineItems.documentId, documentId));
    await tx.insert(lineItems).values({
      ...lineValues(input),
      documentId,
      position: (positionResult.value ?? 0) + 1,
    });
    return recalculateDocument(tx, documentId);
  });
}

export async function updateLineItem(
  userId: string,
  documentId: string,
  lineItemId: string,
  patch: Partial<LineInput>,
  validate: (value: unknown) => LineInput,
) {
  return db.transaction(async (tx) => {
    const document = await ownedDocumentForUpdate(tx, userId, documentId);
    if (document.status === "finalized") throw finalizedError();
    const [existing] = await tx
      .select()
      .from(lineItems)
      .where(and(eq(lineItems.id, lineItemId), eq(lineItems.documentId, documentId)));
    if (!existing) throw new DomainError(404, "LINE_ITEM_NOT_FOUND", "Line item not found.");
    const input = validate({
      description: existing.description,
      quantity: existing.quantity,
      unitPrice: existing.unitPrice,
      discountType: existing.discountType,
      discountValue: existing.discountValue,
      taxPercent: existing.taxPercent,
      ...patch,
    });
    await tx.update(lineItems).set({ ...lineValues(input), updatedAt: new Date() }).where(eq(lineItems.id, lineItemId));
    return recalculateDocument(tx, documentId);
  });
}

export async function deleteLineItem(userId: string, documentId: string, lineItemId: string) {
  return db.transaction(async (tx) => {
    const document = await ownedDocumentForUpdate(tx, userId, documentId);
    if (document.status === "finalized") throw finalizedError();
    const deleted = await tx
      .delete(lineItems)
      .where(and(eq(lineItems.id, lineItemId), eq(lineItems.documentId, documentId)))
      .returning({ id: lineItems.id });
    if (!deleted.length) throw new DomainError(404, "LINE_ITEM_NOT_FOUND", "Line item not found.");
    return recalculateDocument(tx, documentId);
  });
}

export async function finalizeDocument(userId: string, documentId: string) {
  return db.transaction(async (tx) => {
    const document = await ownedDocumentForUpdate(tx, userId, documentId);
    if (document.status === "finalized") {
      const lines = await tx.select().from(lineItems).where(eq(lineItems.documentId, documentId)).orderBy(asc(lineItems.position));
      return { ...document, lines: lines.map(presentLine) };
    }
    const [{ count }] = await tx.select({ count: max(lineItems.position) }).from(lineItems).where(eq(lineItems.documentId, documentId));
    if (count === null) throw new DomainError(422, "EMPTY_DOCUMENT", "Add at least one line item before finalizing.");
    const recalculated = await recalculateDocument(tx, documentId);
    const [finalized] = await tx
      .update(documents)
      .set({ status: "finalized", finalizedAt: new Date(), updatedAt: new Date() })
      .where(eq(documents.id, documentId))
      .returning();
    return { ...recalculated, ...finalized };
  });
}

export async function duplicateDocument(userId: string, documentId: string) {
  return db.transaction(async (tx) => {
    const source = await ownedDocumentForUpdate(tx, userId, documentId);
    if (source.status !== "finalized") {
      throw new DomainError(409, "DOCUMENT_NOT_FINALIZED", "Only finalized documents can be duplicated.");
    }
    const sourceLines = await tx.select().from(lineItems).where(eq(lineItems.documentId, documentId)).orderBy(asc(lineItems.position));
    const [copy] = await tx
      .insert(documents)
      .values({ userId, title: `Copy of ${source.title}`, customer: source.customer, issueDate: source.issueDate })
      .returning();
    if (sourceLines.length) {
      await tx.insert(lineItems).values(
        sourceLines.map((line) => ({
          documentId: copy.id,
          position: line.position,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountType: line.discountType,
          discountValue: line.discountValue,
          taxPercent: line.taxPercent,
          subtotal: line.subtotal,
          discountAmount: line.discountAmount,
          taxAmount: line.taxAmount,
          lineTotal: line.lineTotal,
        })),
      );
    }
    return recalculateDocument(tx, copy.id);
  });
}

export async function summaryReport(userId: string, from: string, to: string) {
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.userId, userId), gte(documents.issueDate, from), lte(documents.issueDate, to)));
  const total = (field: keyof Pick<DocumentRow, "grandTotal" | "totalTax" | "totalDiscount">) =>
    rows.reduce((sum, row) => sum.plus(row[field]), new Decimal(0)).toFixed(2);
  return {
    from,
    to,
    documentCount: rows.length,
    grandTotal: total("grandTotal"),
    totalTax: total("totalTax"),
    totalDiscount: total("totalDiscount"),
  };
}
