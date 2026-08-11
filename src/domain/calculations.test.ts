import { describe, expect, it } from "vitest";
import { calculateDocument, calculateLine } from "./calculations";

describe("pricing calculations", () => {
  it("matches the worked pricing example", () => {
    const lines = [
      calculateLine({ quantity: "2", unitPrice: "100.00", discount: { type: "percent", value: "10" }, taxPercent: "5" }),
      calculateLine({ quantity: "1", unitPrice: "50.00", discount: null, taxPercent: "5" }),
      calculateLine({ quantity: "1", unitPrice: "200.00", discount: { type: "fixed", value: "20" }, taxPercent: null }),
    ];

    expect(lines).toEqual([
      { subtotal: "200.00", discountAmount: "20.00", discountedAmount: "180.00", taxAmount: "9.00", lineTotal: "189.00" },
      { subtotal: "50.00", discountAmount: "0.00", discountedAmount: "50.00", taxAmount: "2.50", lineTotal: "52.50" },
      { subtotal: "200.00", discountAmount: "20.00", discountedAmount: "180.00", taxAmount: "0.00", lineTotal: "180.00" },
    ]);
    expect(calculateDocument(lines)).toEqual({
      subtotal: "450.00",
      totalDiscount: "40.00",
      totalTax: "11.50",
      grandTotal: "421.50",
    });
  });

  it("rounds half-up per line", () => {
    expect(calculateLine({ quantity: "1", unitPrice: "0.05", discount: null, taxPercent: "10" })).toMatchObject({
      taxAmount: "0.01",
      lineTotal: "0.06",
    });
  });

  it("taxes the discounted amount", () => {
    expect(calculateLine({ quantity: "1", unitPrice: "100", discount: { type: "fixed", value: "25" }, taxPercent: "10" })).toMatchObject({
      discountedAmount: "75.00",
      taxAmount: "7.50",
      lineTotal: "82.50",
    });
  });

  it("allows a full discount and produces no tax", () => {
    expect(calculateLine({ quantity: "1", unitPrice: "10", discount: { type: "percent", value: "100" }, taxPercent: "20" })).toMatchObject({
      discountAmount: "10.00",
      taxAmount: "0.00",
      lineTotal: "0.00",
    });
  });

  it("rejects a fixed discount larger than the subtotal", () => {
    expect(() =>
      calculateLine({ quantity: "1", unitPrice: "10", discount: { type: "fixed", value: "10.01" }, taxPercent: null }),
    ).toThrow("Fixed discount cannot exceed the line subtotal");
  });

  it("rejects calculated values outside the persisted money range", () => {
    expect(() => calculateLine({ quantity: "1000", unitPrice: "99999999999999.99", discount: null, taxPercent: null }))
      .toThrow("Calculated amount exceeds the supported money range");
  });
});
