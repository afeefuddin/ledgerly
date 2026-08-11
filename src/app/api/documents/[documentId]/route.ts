import { deleteDocument, getDocument, updateDocument } from "@/domain/documents";
import { errorResponse } from "@/domain/errors";
import { documentPatchSchema } from "@/domain/validation";
import { jsonBody, requireUserId } from "@/lib/api";

type Context = { params: Promise<{ documentId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { documentId } = await params;
    return Response.json({ document: await getDocument(await requireUserId(), documentId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { documentId } = await params;
    const document = await updateDocument(
      await requireUserId(),
      documentId,
      documentPatchSchema.parse(await jsonBody(request)),
    );
    return Response.json({ document });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { documentId } = await params;
    await deleteDocument(await requireUserId(), documentId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
