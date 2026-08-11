# Ledgerly

Ledgerly is a web application for creating customer pricing documents with per-line discounts and taxes. Calculations are performed on the server, finalized documents are immutable, and date-range reports summarize document totals.

**Live app:** [ledgerly-pricing.vercel.app](https://ledgerly-pricing.vercel.app)

## Features

- Email and password authentication
- User-scoped documents and line items
- Fixed or percentage discounts per line
- Tax applied after discounts
- Server-calculated subtotals, discounts, tax, and grand totals
- Draft and finalized document lifecycle
- Finalized-document duplication into editable drafts
- Date-range summary reports
- Print-friendly document view
- Responsive interface with accessible validation and feedback

## Tech stack

- Next.js, React, and TypeScript
- PostgreSQL on Neon
- Drizzle ORM and migrations
- Better Auth
- Decimal.js and Zod
- Vitest
- Bun

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) 1.3 or newer
- PostgreSQL 15 or a Neon database

### Installation

```bash
bun install
cp .env.example .env
```

Configure the environment variables in `.env`:

```dotenv
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=replace-with-a-random-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate an authentication secret with:

```bash
openssl rand -base64 32
```

Apply the database migration and start the development server:

```bash
bun run db:migrate
bun run dev
```

Open [localhost:3000](http://localhost:3000) and create an account.

### Sample data

After creating an account, seed a worked pricing example for that user:

```bash
SEED_USER_EMAIL=you@example.com bun run db:seed
```

## Calculation policy

Money is calculated with Decimal.js and stored in PostgreSQL `numeric` columns. The API accepts JSON numbers or decimal strings for numeric inputs, normalizes them to decimal strings on the server, and returns decimal values as strings to avoid floating-point drift.

Each line is calculated independently using round-half-up to two decimal places:

1. `subtotal = round(quantity × unit price, 2)`
2. `discount = round(subtotal × discount percent ÷ 100, 2)`, or the two-decimal fixed discount
3. `discounted amount = subtotal − discount`
4. `tax = round(discounted amount × tax percent ÷ 100, 2)`
5. `line total = discounted amount + tax`
6. Document totals are the exact sums of the already-rounded line values

Example:

| Line | Subtotal | Discount | Tax | Total |
| --- | ---: | ---: | ---: | ---: |
| Widget A | $200.00 | $20.00 | $9.00 | $189.00 |
| Widget B | $50.00 | $0.00 | $2.50 | $52.50 |
| Service fee | $200.00 | $20.00 | $0.00 | $180.00 |
| **Document** | **$450.00** | **$40.00** | **$11.50** | **$421.50** |

A fixed discount greater than the line subtotal is rejected. Discount and tax percentages must be between 0 and 100.

## Document lifecycle

- Draft documents allow metadata and line-item changes.
- Finalization requires at least one valid line item.
- Finalization recalculates and locks the document in one database transaction.
- Finalized documents reject edits and deletion with `409 DOCUMENT_FINALIZED`.
- Repeating a finalize request is safe and returns the existing finalized document.
- Duplicating a finalized document creates a separate editable draft and recalculates its totals.

Every database query is scoped to the authenticated user. Requests for resources belonging to another user return `404`.

## API

All document and reporting endpoints require an authenticated session.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET`, `POST` | `/api/documents` | List or create documents |
| `GET`, `PATCH`, `DELETE` | `/api/documents/:id` | Read, update, or delete a draft |
| `GET`, `POST` | `/api/documents/:id/line-items` | List or add line items |
| `GET`, `PATCH`, `DELETE` | `/api/documents/:id/line-items/:lineId` | Read, update, or remove a line item |
| `POST` | `/api/documents/:id/finalize` | Finalize a draft |
| `POST` | `/api/documents/:id/duplicate` | Duplicate a finalized document |
| `GET` | `/api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | Return an inclusive date-range summary |

Errors use a consistent response shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "fields": {}
  }
}
```

## Testing

```bash
bun run test
bun run typecheck
bun run lint
bun run build
```

The test suite covers the worked calculation example, discount and tax ordering, rounding boundaries, full discounts, invalid values, and report date validation.

## Deployment

The production app is deployed on Vercel with Neon PostgreSQL. Configure the environment variables listed above, run `bun run db:migrate` against the production database, and deploy the Next.js application.

## Assumptions and tradeoffs

- USD is the single display currency. Currency conversion and locale-specific formatting are not included.
- Quantities may have up to three decimal places and must be at least `1`. Money inputs have up to two decimal places; percentage inputs have up to four.
- Fixed discounts greater than the rounded line subtotal are rejected rather than clamped.
- Draft documents may be saved without line items, but at least one valid line is required to finalize.
- Summary reports include both draft and finalized documents whose issue dates fall within the inclusive date range.
- Issue dates are stored as date-only values so report boundaries do not shift across time zones.
- Calculated totals are stored as server-generated snapshots and recalculated transactionally after every line mutation. This keeps reports consistent with document views at the cost of additional writes.
- The printable document uses HTML and print CSS rather than generated PDFs.
- Email verification and password recovery are not included in the current authentication flow.

## Before production

- Add email verification, password recovery, login throttling, and broader abuse protection.
- Add audit history for document edits and finalization.
- Add configurable currencies and locale-aware formatting.
- Add pagination and filtering for large document collections.
- Add optimistic concurrency feedback for simultaneous editors.
- Add database-backed API integration tests and browser end-to-end tests to CI.
- Add structured logging, error monitoring, database backup verification, and operational alerts.
