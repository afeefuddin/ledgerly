import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { calculateDocument, calculateLine } from "../src/domain/calculations";
import { documents, lineItems, user } from "../src/db/schema";

const databaseUrl = process.env.DATABASE_URL;
const seedEmail = process.env.SEED_USER_EMAIL;

if (!databaseUrl || !seedEmail) {
  throw new Error("DATABASE_URL and SEED_USER_EMAIL are required. Sign up first, then seed that account.");
}

const client = postgres(databaseUrl, { prepare: false });
const db = drizzle(client);
const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.email, seedEmail.toLowerCase()));

if (!owner) throw new Error(`No account found for ${seedEmail}. Sign up in the app first.`);

const inputs = [
  { description: "Widget A", quantity: "2.000", unitPrice: "100.00", discountType: "percent" as const, discountValue: "10.0000", taxPercent: "5.0000" },
  { description: "Widget B", quantity: "1.000", unitPrice: "50.00", discountType: null, discountValue: null, taxPercent: "5.0000" },
  { description: "Service fee", quantity: "1.000", unitPrice: "200.00", discountType: "fixed" as const, discountValue: "20.0000", taxPercent: null },
];

const calculated = inputs.map((line) => calculateLine({
  quantity: line.quantity,
  unitPrice: line.unitPrice,
  discount: line.discountType && line.discountValue ? { type: line.discountType, value: line.discountValue } : null,
  taxPercent: line.taxPercent,
}));
const totals = calculateDocument(calculated);

await db.transaction(async (tx) => {
  const [document] = await tx.insert(documents).values({
    userId: owner.id,
    title: "Pricing sample",
    customer: "Acme Company",
    issueDate: new Date().toISOString().slice(0, 10),
    ...totals,
  }).returning();
  await tx.insert(lineItems).values(inputs.map((line, index) => ({
    ...line,
    documentId: document.id,
    position: index + 1,
    subtotal: calculated[index].subtotal,
    discountAmount: calculated[index].discountAmount,
    taxAmount: calculated[index].taxAmount,
    lineTotal: calculated[index].lineTotal,
  })));
  console.log(`Created sample document ${document.id} for ${seedEmail}`);
});

await client.end();
