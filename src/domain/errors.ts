import { ZodError } from "zod";
import { CalculationError } from "./calculations";

export class DomainError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function finalizedError() {
  return new DomainError(409, "DOCUMENT_FINALIZED", "Finalized documents are read-only.");
}

export function notFoundError() {
  return new DomainError(404, "DOCUMENT_NOT_FOUND", "Document not found.");
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      fields[key] = [...(fields[key] ?? []), issue.message];
    }
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "Please correct the highlighted fields.", fields } },
      { status: 422 },
    );
  }
  if (error instanceof CalculationError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: 422 });
  }
  if (error instanceof DomainError) {
    return Response.json(
      { error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } },
      { status: error.status },
    );
  }
  console.error(error);
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } }, { status: 500 });
}
