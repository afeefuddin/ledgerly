import { duplicateDocument } from "@/domain/documents";
import { errorResponse } from "@/domain/errors";
import { requireUserId } from "@/lib/api";

type Context = { params: Promise<{ documentId: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const { documentId } = await params;
    return Response.json({ document: await duplicateDocument(await requireUserId(), documentId) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
