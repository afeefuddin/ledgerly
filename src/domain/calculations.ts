import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type DiscountInput =
  | { type: "fixed"; value: string }
  | { type: "percent"; value: string }
  | null;

export interface LineCalculationInput {
  quantity: string;
  unitPrice: string;
  discount: DiscountInput;
  taxPercent: string | null;
}

export interface LineCalculation {
  subtotal: string;
  discountAmount: string;
  discountedAmount: string;
  taxAmount: string;
  lineTotal: string;
}

export interface DocumentCalculation {
  subtotal: string;
  totalDiscount: string;
  totalTax: string;
  grandTotal: string;
}

const money = (value: Decimal.Value) => new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const formatMoney = (value: Decimal.Value) => money(value).toFixed(2);
const maximumMoney = new Decimal("99999999999999.99");

function assertMoneyRange(value: Decimal) {
  if (value.abs().greaterThan(maximumMoney)) {
    throw new CalculationError("AMOUNT_TOO_LARGE", "Calculated amount exceeds the supported money range.");
  }
}

export function calculateLine(input: LineCalculationInput): LineCalculation {
  const subtotal = money(new Decimal(input.quantity).times(input.unitPrice));
  assertMoneyRange(subtotal);
  let discountAmount = new Decimal(0);

  if (input.discount?.type === "fixed") {
    discountAmount = money(input.discount.value);
  } else if (input.discount?.type === "percent") {
    discountAmount = money(subtotal.times(input.discount.value).dividedBy(100));
  }

  if (discountAmount.greaterThan(subtotal)) {
    throw new CalculationError("FIXED_DISCOUNT_EXCEEDS_SUBTOTAL", "Fixed discount cannot exceed the line subtotal.");
  }

  const discountedAmount = subtotal.minus(discountAmount);
  const taxAmount = input.taxPercent
    ? money(discountedAmount.times(input.taxPercent).dividedBy(100))
    : new Decimal(0);
  const lineTotal = discountedAmount.plus(taxAmount);
  assertMoneyRange(discountAmount);
  assertMoneyRange(taxAmount);
  assertMoneyRange(lineTotal);

  return {
    subtotal: formatMoney(subtotal),
    discountAmount: formatMoney(discountAmount),
    discountedAmount: formatMoney(discountedAmount),
    taxAmount: formatMoney(taxAmount),
    lineTotal: formatMoney(lineTotal),
  };
}

export function calculateDocument(lines: LineCalculation[]): DocumentCalculation {
  const sum = (field: keyof Pick<LineCalculation, "subtotal" | "discountAmount" | "taxAmount" | "lineTotal">) =>
    lines.reduce((total, line) => total.plus(line[field]), new Decimal(0));

  const subtotal = sum("subtotal");
  const totalDiscount = sum("discountAmount");
  const totalTax = sum("taxAmount");
  const grandTotal = sum("lineTotal");
  [subtotal, totalDiscount, totalTax, grandTotal].forEach(assertMoneyRange);

  return {
    subtotal: formatMoney(subtotal),
    totalDiscount: formatMoney(totalDiscount),
    totalTax: formatMoney(totalTax),
    grandTotal: formatMoney(grandTotal),
  };
}

export class CalculationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CalculationError";
  }
}
