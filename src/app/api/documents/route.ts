import { createDocument, listDocuments } from "@/domain/documents";
import { errorResponse } from "@/domain/errors";
import { documentCreateSchema } from "@/domain/validation";
import { jsonBody, requireUserId } from "@/lib/api";

export async function GET() {
  try {
    return Response.json({ documents: await listDocuments(await requireUserId()) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const document = await createDocument(await requireUserId(), documentCreateSchema.parse(await jsonBody(request)));
    return Response.json({ document }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
