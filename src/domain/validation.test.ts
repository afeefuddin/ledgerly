import { describe, expect, it } from "vitest";
import { lineInputSchema, reportQuerySchema } from "./validation";

const validLine = {
  description: "Widget",
  quantity: "1",
  unitPrice: "10.00",
  discountType: null,
  discountValue: null,
  taxPercent: null,
};

describe("line validation", () => {
  it("accepts JSON numbers and normalizes them to decimal strings", () => {
    const result = lineInputSchema.parse({
      ...validLine,
      quantity: 2,
      unitPrice: 100,
      discountType: "percent",
      discountValue: 10,
      taxPercent: 5,
    });
    expect(result).toMatchObject({ quantity: "2", unitPrice: "100", discountValue: "10", taxPercent: "5" });
  });

  it("rejects quantity below one", () => {
    expect(lineInputSchema.safeParse({ ...validLine, quantity: "0" }).success).toBe(false);
  });

  it("returns specific errors for negative quantity and price", () => {
    const quantity = lineInputSchema.safeParse({ ...validLine, quantity: -1 });
    const price = lineInputSchema.safeParse({ ...validLine, unitPrice: -1 });
    expect(quantity.error?.issues[0].message).toBe("Quantity must be at least 1.");
    expect(price.error?.issues[0].message).toBe("Unit price cannot be negative.");
  });

  it("rejects conflicting discount fields", () => {
    expect(lineInputSchema.safeParse({ ...validLine, discountType: "fixed", discountValue: null }).success).toBe(false);
  });

  it("enforces percent bounds and fixed-money precision", () => {
    expect(lineInputSchema.safeParse({ ...validLine, discountType: "percent", discountValue: "100.01" }).success).toBe(false);
    expect(lineInputSchema.safeParse({ ...validLine, discountType: "fixed", discountValue: "1.001" }).success).toBe(false);
    expect(lineInputSchema.safeParse({ ...validLine, taxPercent: "101" }).success).toBe(false);
  });

  it("rejects values that exceed database precision", () => {
    expect(lineInputSchema.safeParse({ ...validLine, unitPrice: "100000000000000.00" }).success).toBe(false);
  });
});

describe("report validation", () => {
  it("requires an ordered inclusive range", () => {
    expect(reportQuerySchema.safeParse({ from: "2026-08-12", to: "2026-08-01" }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ from: "2026-08-12", to: "2026-08-12" }).success).toBe(true);
  });
});
