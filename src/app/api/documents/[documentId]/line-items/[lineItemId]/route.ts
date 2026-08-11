import { deleteLineItem, getDocument, updateLineItem } from "@/domain/documents";
import { DomainError, errorResponse } from "@/domain/errors";
import { lineInputSchema, linePatchSchema } from "@/domain/validation";
import { jsonBody, requireUserId } from "@/lib/api";

type Context = { params: Promise<{ documentId: string; lineItemId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { documentId, lineItemId } = await params;
    const document = await getDocument(await requireUserId(), documentId);
    const lineItem = document.lines.find((line) => line.id === lineItemId);
    if (!lineItem) throw new DomainError(404, "LINE_ITEM_NOT_FOUND", "Line item not found.");
    return Response.json({ lineItem });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { documentId, lineItemId } = await params;
    const patch = linePatchSchema.parse(await jsonBody(request));
    const document = await updateLineItem(await requireUserId(), documentId, lineItemId, patch, (value) => lineInputSchema.parse(value));
    return Response.json({ document });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { documentId, lineItemId } = await params;
    const document = await deleteLineItem(await requireUserId(), documentId, lineItemId);
    return Response.json({ document });
  } catch (error) {
    return errorResponse(error);
  }
}
