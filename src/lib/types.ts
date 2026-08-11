export type DocumentStatus = "draft" | "finalized";
export type DiscountType = "fixed" | "percent" | null;

export interface LineItem {
  id: string;
  documentId: string;
  position: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discountType: DiscountType;
  discountValue: string | null;
  taxPercent: string | null;
  subtotal: string;
  discountAmount: string;
  discountedAmount: string;
  taxAmount: string;
  lineTotal: string;
}

export interface PricingDocument {
  id: string;
  title: string;
  customer: string;
  issueDate: string;
  status: DocumentStatus;
  subtotal: string;
  totalDiscount: string;
  totalTax: string;
  grandTotal: string;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: LineItem[];
}

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}
