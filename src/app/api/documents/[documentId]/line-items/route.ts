import { createLineItem, getDocument } from "@/domain/documents";
import { errorResponse } from "@/domain/errors";
import { lineInputSchema } from "@/domain/validation";
import { jsonBody, requireUserId } from "@/lib/api";

type Context = { params: Promise<{ documentId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { documentId } = await params;
    const document = await getDocument(await requireUserId(), documentId);
    return Response.json({ lineItems: document.lines });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { documentId } = await params;
    const document = await createLineItem(await requireUserId(), documentId, lineInputSchema.parse(await jsonBody(request)));
    return Response.json({ document }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
