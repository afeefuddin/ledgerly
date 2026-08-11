import { summaryReport } from "@/domain/documents";
import { errorResponse } from "@/domain/errors";
import { reportQuerySchema } from "@/domain/validation";
import { requireUserId } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = reportQuerySchema.parse({ from: url.searchParams.get("from"), to: url.searchParams.get("to") });
    return Response.json({ summary: await summaryReport(await requireUserId(), query.from, query.to) });
  } catch (error) {
    return errorResponse(error);
  }
}
