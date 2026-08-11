import { z } from "zod";
import Decimal from "decimal.js";

const decimalPattern = /^-?\d+(?:\.\d+)?$/;

function decimalString(label: string, decimals: number, integerDigits: number) {
  return z.preprocess(
    (value) => (typeof value === "number" && Number.isFinite(value) ? value.toString() : value),
    z
      .string({ error: `${label} must be a number.` })
      .trim()
      .min(1, `${label} is required.`)
      .regex(decimalPattern, `${label} must be a number.`)
      .refine((value) => (value.split(".")[1]?.length ?? 0) <= decimals, `${label} may have at most ${decimals} decimal places.`)
      .refine((value) => {
        const whole = value.replace("-", "").split(".")[0].replace(/^0+/, "");
        return whole.length <= integerDigits;
      }, `${label} is too large.`),
  );
}

function nonNegativeDecimal(label: string, decimals: number, integerDigits: number) {
  return decimalString(label, decimals, integerDigits).refine(
    (value) => new Decimal(value).isPositive() || new Decimal(value).isZero(),
    `${label} cannot be negative.`,
  );
}

const requiredText = (label: string, max: number) =>
  z.string({ error: `${label} is required.` }).trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

export const documentCreateSchema = z.object({
  title: requiredText("Title", 160),
  customer: requiredText("Customer", 160),
  issueDate: z.iso.date({ error: "Issue date must use YYYY-MM-DD." }),
});

export const documentPatchSchema = documentCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one document field is required.",
});

const lineShape = {
  description: requiredText("Description", 240),
  quantity: decimalString("Quantity", 3, 9).refine(
    (value) => new Decimal(value).greaterThanOrEqualTo(1),
    "Quantity must be at least 1.",
  ),
  unitPrice: nonNegativeDecimal("Unit price", 2, 14),
  discountType: z.enum(["fixed", "percent"]).nullable().default(null),
  discountValue: nonNegativeDecimal("Discount value", 4, 12).nullable().default(null),
  taxPercent: nonNegativeDecimal("Tax percent", 4, 3)
    .refine((value) => new Decimal(value).lessThanOrEqualTo(100), "Tax percent must be between 0 and 100.")
    .nullable()
    .default(null),
};

function validateDiscount(
  value: { discountType?: "fixed" | "percent" | null; discountValue?: string | null },
  context: z.RefinementCtx,
) {
  if ((value.discountType === null) !== (value.discountValue === null)) {
    context.addIssue({
      code: "custom",
      path: ["discountValue"],
      message: "Discount type and value must be provided together.",
    });
  }
  if (value.discountType === "percent" && value.discountValue && new Decimal(value.discountValue).greaterThan(100)) {
    context.addIssue({
      code: "custom",
      path: ["discountValue"],
      message: "Discount percent must be between 0 and 100.",
    });
  }
  if (value.discountType === "fixed" && value.discountValue && (value.discountValue.split(".")[1]?.length ?? 0) > 2) {
    context.addIssue({
      code: "custom",
      path: ["discountValue"],
      message: "Fixed discount may have at most 2 decimal places.",
    });
  }
}

export const lineInputSchema = z
  .object(lineShape)
  .superRefine((value, context) => {
    validateDiscount(value, context);
  });

export const linePatchSchema = z
  .object(lineShape)
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one line item field is required." });

export const reportQuerySchema = z
  .object({
    from: z.iso.date({ error: "From date must use YYYY-MM-DD." }),
    to: z.iso.date({ error: "To date must use YYYY-MM-DD." }),
  })
  .refine((value) => value.from <= value.to, { path: ["to"], message: "To date must be on or after from date." });

export type DocumentCreateInput = z.infer<typeof documentCreateSchema>;
export type LineInput = z.infer<typeof lineInputSchema>;
