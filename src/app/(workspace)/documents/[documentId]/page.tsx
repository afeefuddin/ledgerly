import type { Metadata } from "next";
import { DocumentEditor } from "@/components/document-editor";

export const metadata: Metadata = { title: "Document" };
export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ duplicated?: string }>;
}) {
  const [{ documentId }, query] = await Promise.all([params, searchParams]);
  return <DocumentEditor documentId={documentId} duplicated={query.duplicated === "1"} />;
}
