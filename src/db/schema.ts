import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("session_token_idx").on(table.token), index("session_user_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const documentStatus = pgEnum("document_status", ["draft", "finalized"]);
export const discountType = pgEnum("discount_type", ["fixed", "percent"]);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    customer: text("customer").notNull(),
    issueDate: date("issue_date", { mode: "string" }).notNull(),
    status: documentStatus("status").notNull().default("draft"),
    subtotal: numeric("subtotal", { precision: 16, scale: 2 }).notNull().default("0.00"),
    totalDiscount: numeric("total_discount", { precision: 16, scale: 2 }).notNull().default("0.00"),
    totalTax: numeric("total_tax", { precision: 16, scale: 2 }).notNull().default("0.00"),
    grandTotal: numeric("grand_total", { precision: 16, scale: 2 }).notNull().default("0.00"),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("documents_user_issue_date_idx").on(table.userId, table.issueDate)],
);

export const lineItems = pgTable(
  "line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 16, scale: 2 }).notNull(),
    discountType: discountType("discount_type"),
    discountValue: numeric("discount_value", { precision: 16, scale: 4 }),
    taxPercent: numeric("tax_percent", { precision: 7, scale: 4 }),
    subtotal: numeric("subtotal", { precision: 16, scale: 2 }).notNull(),
    discountAmount: numeric("discount_amount", { precision: 16, scale: 2 }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 16, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 16, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("line_items_document_position_idx").on(table.documentId, table.position),
    check("line_items_quantity_check", sql`${table.quantity} >= 1`),
    check("line_items_unit_price_check", sql`${table.unitPrice} >= 0`),
    check("line_items_tax_check", sql`${table.taxPercent} is null or (${table.taxPercent} >= 0 and ${table.taxPercent} <= 100)`),
    check(
      "line_items_discount_shape_check",
      sql`(${table.discountType} is null and ${table.discountValue} is null) or (${table.discountType} is not null and ${table.discountValue} is not null and ${table.discountValue} >= 0)`,
    ),
  ],
);

export type DocumentRow = typeof documents.$inferSelect;
export type LineItemRow = typeof lineItems.$inferSelect;
