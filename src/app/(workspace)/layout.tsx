import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { auth } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <WorkspaceShell email={session.user.email}>{children}</WorkspaceShell>;
}
